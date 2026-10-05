import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { TrackQueue } from "@darco2903/track-queue";
import { ytDlp, type SearchResult } from "../yt-dlp/index.js";
import {
    AudioPlayerStatus,
    type CreateAudioPlayerOptions,
    createAudioResource,
    AudioPlayer as DiscordAudioPlayer,
    getVoiceConnection,
    StreamType,
    VoiceConnection,
} from "@discordjs/voice";
import { audioCache } from "./index.js";
import type { Track } from "./types/index.js";
import { logger } from "../logger.js";
import { prisma } from "../prisma.js";

export class AudioPlayer {
    protected static _all: Map<string, AudioPlayer> = new Map();

    public static get all(): AudioPlayer[] {
        return Array.from(AudioPlayer._all.values());
    }

    public static get(guildId: string): AudioPlayer | undefined {
        return AudioPlayer._all.get(guildId);
    }

    public readonly guildId: string;
    protected player: DiscordAudioPlayer;
    protected playlist: TrackQueue<Track>;

    public get currentSong(): Track | null {
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

    constructor(guildId: string, options?: CreateAudioPlayerOptions) {
        if (AudioPlayer._all.has(guildId)) {
            throw new Error(`AudioPlayer already exists for guild ${guildId}`);
        }

        this.guildId = guildId;
        AudioPlayer._all.set(guildId, this);
        this.player = new DiscordAudioPlayer(options);
        this.playlist = new TrackQueue();

        this.player.on(AudioPlayerStatus.Idle, async () => {
            logger.debug(`AudioPlayer for guild ${this.guildId} is idle.`);
            if (this.playlist.hasNext) {
                await this.next().map(() => {
                    logger.debug(`Playing next track for guild ${this.guildId}.`);
                });
            } else {
                logger.debug(`No next track for guild ${this.guildId}.`);
            }
        });
    }

    public addSong(searchRes: SearchResult): ResultAsync<Track, string> {
        return ResultAsync.combine([
            ytDlp.getInfo(searchRes.id),
            ResultAsync.fromSafePromise(
                prisma.recently_played
                    .upsert({
                        where: {
                            video_id: searchRes.id,
                        },
                        create: {
                            video_id: searchRes.id,
                            title: searchRes.title,
                            played_at: new Date(),
                        },
                        update: {
                            played_at: new Date(),
                        },
                    })
                    .catch((error) => {
                        logger.error(`Failed to upsert recently played video: ${error}`);
                    }),
            ),
        ])
            .map(([track]) => track)
            .andTee((track) => {
                this.playlist.add(track);
                // console.log(
                //     `Playlist length`,
                //     this.playlist.length,
                //     `current`,
                //     this.playlist.currentPosition,
                //     this.playlist.current?.title,
                // );
            });
    }

    protected _play(id: string): ResultAsync<void, string> {
        const conn = this.connection;
        if (!conn) {
            return errAsync("No voice connection found for this guild.");
        }

        return ResultAsync.fromSafePromise(audioCache.createStream(id)).map(
            ({ destroy, stream }) => {
                const resource = createAudioResource(stream, {
                    inputType: StreamType.Raw,
                });

                conn.subscribe(this.player);
                this.player.play(resource);
            },
        );
    }

    public play(search: SearchResult): ResultAsync<Track, string> {
        const p = this.playing ? okAsync(undefined) : this._play(search.id);
        return ResultAsync.combine([
            //
            this.addSong(search),
            p,
        ]).map(([track]) => track);
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

    public next(): ResultAsync<Track, string> {
        const nextTrack = this.playlist.next();
        if (!nextTrack) {
            logger.debug("No next track found.");
            this.stop();
            return errAsync("No next track found.");
        }

        logger.debug(`Playing next track: ${nextTrack.title}`);
        return this._play(nextTrack.id).map(() => nextTrack);
    }

    public previous(): ResultAsync<Track, string> {
        const previousTrack = this.playlist.previous();
        if (!previousTrack) {
            logger.debug("No previous track found.");
            this.stop();
            return errAsync("No previous track found.");
        }

        logger.debug(`Playing previous track: ${previousTrack.title}`);
        return this._play(previousTrack.id).map(() => previousTrack);
    }

    public seek(time: number): ResultAsync<void, string> {
        if (!this.currentSong) {
            logger.warn("No current song to seek.");
            return errAsync("No current song to seek.");
        }

        return ResultAsync.fromSafePromise(audioCache.createStream(this.currentSong.id, time)).map(
            ({ destroy, stream }) => {
                const resource = createAudioResource(stream, {
                    inputType: StreamType.Raw,
                });

                this.player.play(resource);
            },
        );
    }

    public destroy(): void {
        logger.debug(`Destroying AudioPlayer for guild ${this.guildId}`);
        AudioPlayer._all.delete(this.guildId);

        this.player.stop();
        this.playlist.clear();
    }
}
