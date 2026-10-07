import fs from "fs/promises";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { TrackQueue } from "@darco2903/track-queue";
import {
    AudioPlayerStatus,
    AudioResource,
    type CreateAudioPlayerOptions,
    createAudioResource,
    AudioPlayer as DiscordAudioPlayer,
    getVoiceConnection,
    StreamType,
    VoiceConnection,
} from "@discordjs/voice";
import { Millisecond, Second } from "@darco2903/secondthought";
import { audioCache } from "./index.js";
import type { ITrack } from "./types/index.js";
import { prisma } from "../prisma.js";
import { Guild, VoiceChannel } from "discord.js";
import { joinVoice } from "../voice.js";
import { ytDlp } from "../yt-dlp/index.js";
import { logger } from "../logger.js";
import { config } from "../config.js";

export class AudioPlayer {
    protected static _all: Map<string, AudioPlayer> = new Map();

    public static get all(): AudioPlayer[] {
        return Array.from(AudioPlayer._all.values());
    }

    public static get(guildId: string): AudioPlayer | undefined {
        return AudioPlayer._all.get(guildId);
    }

    protected readonly guild: Guild;
    public readonly guildId: string;
    protected resource: AudioResource | null;
    protected offsetMs: number;
    protected player: DiscordAudioPlayer;
    protected playlist: TrackQueue<ITrack>;
    /** play() is joining the channel or starting the stream; the player is still Idle meanwhile. */
    protected starting: boolean = false;
    /** Set by destroy(). Callers may still hold a reference, e.g. /play across its awaits. */
    protected destroyed: boolean = false;
    // protected eventEmitter: TypedEmitter<PlayerEvents>;

    public get currentSong(): ITrack | null {
        return this.playlist.current;
    }

    public get hasNext(): boolean {
        return this.playlist.hasNext;
    }

    public get hasPrevious(): boolean {
        return this.playlist.hasPrevious;
    }

    protected get connection(): VoiceConnection | undefined {
        return getVoiceConnection(this.guildId);
    }

    public get paused(): boolean {
        return this.player.state.status === AudioPlayerStatus.Paused;
    }

    public get playing(): boolean {
        return this.player.state.status === AudioPlayerStatus.Playing;
    }

    public get voiceChannel(): VoiceChannel | null {
        const conn = this.connection;
        if (!conn) {
            return null;
        }

        const channelId = conn.joinConfig.channelId;
        if (!channelId) {
            return null;
        }

        const channel = this.guild.channels.cache.get(channelId);
        if (!channel || !(channel instanceof VoiceChannel)) {
            return null;
        }

        return channel;
    }

    public get positionMs(): Millisecond {
        return new Millisecond(this.offsetMs + (this.resource?.playbackDuration ?? 0));
    }

    constructor(guild: Guild, options?: CreateAudioPlayerOptions) {
        const guildId = guild.id;
        if (AudioPlayer._all.has(guildId)) {
            throw new Error(`AudioPlayer already exists for guild ${guildId}`);
        }

        this.guild = guild;
        this.guildId = guildId;
        this.offsetMs = 0;
        this.resource = null;
        AudioPlayer._all.set(guildId, this);
        this.player = new DiscordAudioPlayer(options);
        this.playlist = new TrackQueue();
        // this.eventEmitter = new TypedEmitter();

        // Handle the idle event to automatically play the next track in the queue
        this.player.on(AudioPlayerStatus.Idle, async () => {
            logger.debug(`AudioPlayer for guild ${this.guildId} is idle.`);

            if (this.playlist.hasNext) {
                // Tracks that fail during playback come back here through the "error" -> Idle
                // transition. This loop covers tracks that fail to start: skip them.
                while (this.playlist.hasNext) {
                    const res = await this.next();
                    if (res.isOk()) {
                        logger.debug(`Playing next track for guild ${this.guildId}.`);
                        // this.eventEmitter.emit("trackStart", res.value);
                        break;
                    }
                    if (!this.connection) {
                        logger.debug(
                            `No voice connection for guild ${this.guildId}, stopping queue.`,
                        );
                        break;
                    }
                    logger.warn(`Skipping track in guild ${this.guildId}: ${res.error}`);
                }
            } else {
                // this.eventEmitter.emit("statusChange", AudioPlayerStatus.Idle);
                // this.eventEmitter.emit("queueEmpty");
                logger.debug(`No next track for guild ${this.guildId}.`);
            }
        });

        this.player.on("error", (error) => {
            logger.error(`Audio error in guild ${this.guildId}: ${error.message}`);
        });
    }

    public static saveAll(): ResultAsync<void, string> {
        const data = this.all.map((player) => {
            return {
                guildId: player.guildId,
                playlist: player.playlist.toArray(),
                time: player.positionMs.time,
            };
        });
        return ResultAsync.fromPromise(
            fs.writeFile(config.musicplayer.queue_save.path, JSON.stringify(data)),
            (err) => `Failed to save audio player state: ${err}`,
        );
    }

    public addSong(track: ITrack): ResultAsync<ITrack, string> {
        this.playlist.add(track);
        // console.log(
        //     `Playlist length`,
        //     this.playlist.length,
        //     `current`,
        //     this.playlist.currentPosition,
        //     this.playlist.current?.title,
        // );
        return prisma
            .safe(
                prisma.recently_played.upsert({
                    where: {
                        video_id: track.id,
                    },
                    create: {
                        video_id: track.id,
                        title: track.title,
                        played_at: new Date(),
                    },
                    update: {
                        played_at: new Date(),
                    },
                }),
            )
            .orElse((error) => {
                logger.error(`Failed to upsert recently played track: ${error}`);
                return okAsync(undefined);
            })
            .map(() => track);
    }

    protected sub: boolean = false;

    protected _play(id: string, time?: Second): ResultAsync<void, string> {
        if (this.destroyed) {
            return errAsync("Audio player was destroyed.");
        }

        const conn = this.connection;
        if (!conn) {
            logger.error(`No voice connection found for guild ${this.guildId}.`);
            return errAsync("No voice connection found for this guild.");
        }

        this.offsetMs = time?.toMillisecond().time ?? 0;
        return ResultAsync.fromSafePromise(audioCache.createStream(id, time))
            .andThen(({ destroy, stream }) => {
                // createStream() can wait for a download, so check again.
                if (this.destroyed) {
                    stream.destroy(); // stops ffmpeg, the download still finishes for the cache
                    return errAsync("Audio player was destroyed.");
                }

                this.resource = createAudioResource(stream, {
                    inputType: StreamType.Raw,
                });
                if (this.sub === false) {
                    logger.debug(`Subscribing to voice connection for guild ${this.guildId}.`);
                    conn.subscribe(this.player);
                    this.sub = true;
                } else {
                    logger.debug(
                        `Already subscribed to voice connection for guild ${this.guildId}.`,
                    );
                    conn.subscribe(this.player);
                }
                this.player.once(AudioPlayerStatus.Playing, () => {
                    logger.debug(`AudioPlayer for guild ${this.guildId} is now playing.`);
                });
                this.player.play(this.resource);
                return okAsync(undefined);
            })
            .orTee((error) => {
                logger.error(`Failed to play track ${id} for guild ${this.guildId}: ${error}`);
                this.resource = null;
                this.offsetMs = 0;
            });
    }

    public play(id: string, channel: VoiceChannel): ResultAsync<ITrack, string> {
        return ytDlp.getInfo(id).andThen((info) => {
            // getInfo() takes a while, the player may have been destroyed (kick, /leave) meanwhile.
            if (this.destroyed) {
                return errAsync("Audio player was destroyed.");
            }

            const busy = this.starting || this.player.state.status !== AudioPlayerStatus.Idle;
            this.addSong(info); // don't wait for this to finish, we don't care if it fails
            if (busy) {
                return okAsync(info);
            } else {
                const track = this.playlist.current === info ? info : this.playlist.next();
                if (!track) {
                    logger.error(`No track found to play for guild ${this.guildId}.`);
                    return errAsync("No track found to play.");
                }

                this.starting = true;
                return joinVoice(channel.id, channel.guild)
                    .andTee(() => {
                        logger.debug(`Using voice connection for guild ${channel.guildId}`);
                    })
                    .andThen(() => this._play(track.id))
                    .andTee(() => {
                        logger.debug(
                            `Started playing track ${info.title} for guild ${channel.guildId}`,
                        );
                    })
                    .andTee(() => {
                        this.starting = false;
                    })
                    .orTee(() => {
                        this.starting = false;
                    })
                    .map(() => info);
            }
        });
    }

    public stop(): boolean {
        this.playlist.clear();
        return this.player.stop();
    }

    public pause(): boolean {
        return this.player.pause(true);
    }

    public resume(): boolean {
        return this.player.unpause();
    }

    public next(): ResultAsync<ITrack, string> {
        const nextTrack = this.playlist.next();
        if (!nextTrack) {
            logger.debug("No next track found.");
            this.stop();
            return errAsync("No next track found.");
        }

        logger.debug(`Playing next track: ${nextTrack.title}`);
        return this._play(nextTrack.id).map(() => nextTrack);
    }

    public previous(): ResultAsync<ITrack, string> {
        const previousTrack = this.playlist.previous();
        if (!previousTrack) {
            logger.debug("No previous track found.");
            this.stop();
            return errAsync("No previous track found.");
        }

        logger.debug(`Playing previous track: ${previousTrack.title}`);
        return this._play(previousTrack.id).map(() => previousTrack);
    }

    public seek(time: Second): ResultAsync<void, string> {
        if (!this.currentSong) {
            logger.warn("No current song to seek.");
            return errAsync("No current song to seek.");
        }

        const sec = time.toSecond();
        if (sec.time > (this.currentSong.duration ?? 0)) {
            logger.warn(
                `Seek time ${sec.toStringWithUnit()} exceeds track duration ${
                    this.currentSong.duration ?? 0
                }s.`,
            );
            return errAsync("Seek time exceeds track duration.");
        }
        logger.debug(`Seeking to ${sec.toStringWithUnit()} in track ${this.currentSong.title}`);
        return this._play(this.currentSong.id, time);
    }

    public destroy(): void {
        logger.debug(`Destroying AudioPlayer for guild ${this.guildId}`);
        this.destroyed = true;
        this.starting = false;
        this.player.removeAllListeners();
        this.player.stop(true);
        this.offsetMs = 0;
        this.playlist.clear();
        this.resource = null;
        if (AudioPlayer._all.get(this.guildId) === this) {
            AudioPlayer._all.delete(this.guildId);
        }
    }
}
