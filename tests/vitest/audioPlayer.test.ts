import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { PassThrough } from "stream";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { Second } from "@darco2903/secondthought";
import { VoiceChannel, type Client, type Guild } from "discord.js";
import {
    AudioPlayerStatus,
    NoSubscriberBehavior,
    createAudioResource,
    getVoiceConnection,
} from "@discordjs/voice";
import type { ITrack } from "../../src/music-player/types/index.js";
import { testConfig } from "./fakes/config.js";

// The Discord audio player as a small state machine: play() goes straight to Playing,
// or stays Buffering when autoPlay is off so the test decides when it starts.
vi.mock("@discordjs/voice", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@discordjs/voice")>();
    const { EventEmitter } = await import("events");
    const { Idle, Playing, Paused, Buffering } = actual.AudioPlayerStatus;

    class FakeDiscordPlayer extends EventEmitter {
        public state: { status: string } = { status: Idle };
        public autoPlay = true;
        constructor(public readonly options?: unknown) {
            super();
        }
        public setStatus(status: string): void {
            const old = this.state;
            this.state = { status };
            this.emit("stateChange", old, this.state);
            this.emit(status, old, this.state);
        }
        public play = vi.fn(() => this.setStatus(this.autoPlay ? Playing : Buffering));
        public stop = vi.fn(() => {
            if (this.state.status === Idle) return false;
            this.setStatus(Idle);
            return true;
        });
        public pause = vi.fn(() => {
            if (this.state.status !== Playing) return false;
            this.setStatus(Paused);
            return true;
        });
        public unpause = vi.fn(() => {
            if (this.state.status !== Paused) return false;
            this.setStatus(Playing);
            return true;
        });
    }

    return {
        ...actual,
        AudioPlayer: FakeDiscordPlayer,
        getVoiceConnection: vi.fn(),
        createAudioResource: vi.fn(() => ({ playbackDuration: 0 })),
    };
});

const mocks = vi.hoisted(() => ({
    createStream: vi.fn(),
    upsert: vi.fn(),
    joinVoice: vi.fn(),
    getInfo: vi.fn(),
}));

vi.mock("../../src/music-player/index.js", () => ({
    audioCache: { createStream: mocks.createStream },
}));
vi.mock("../../src/prisma.js", () => ({
    prisma: {
        safe: <T>(promise: Promise<T>) => ResultAsync.fromPromise(promise, (e) => e as Error),
        recently_played: { upsert: mocks.upsert },
    },
}));
vi.mock("../../src/voice.js", () => ({ joinVoice: mocks.joinVoice }));
vi.mock("../../src/yt-dlp/index.js", () => ({ ytDlp: { getInfo: mocks.getInfo } }));

const { AudioPlayer } = await import("../../src/music-player/AudioPlayer.js");
type Player = InstanceType<typeof AudioPlayer>;

interface FakeDiscordPlayer {
    state: { status: string };
    autoPlay: boolean;
    options?: { behaviors?: { noSubscriber?: string } };
    setStatus(status: string): void;
    play: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
}

interface FakeConnection {
    subscribe: ReturnType<typeof vi.fn>;
    joinConfig: { channelId: string | null };
}

function discordPlayer(player: Player): FakeDiscordPlayer {
    return (player as unknown as { player: FakeDiscordPlayer }).player;
}

function track(id: string, duration: number | null = 200): ITrack {
    return { id, title: `Title ${id}`, webpage_url: `https://youtu.be/${id}`, duration };
}

/** A guild whose channel cache holds one real-looking VoiceChannel */
function fakeGuild(id = "guild-1") {
    const channels = new Map<string, unknown>();
    const guild = { id, channels: { cache: channels } } as unknown as Guild;
    const channel = Object.create(VoiceChannel.prototype) as VoiceChannel;
    Object.defineProperties(channel, {
        id: { value: `voice-${id}` },
        guild: { value: guild },
        guildId: { value: id },
    });
    channels.set(channel.id, channel);
    return { guild, channel };
}

let connection: FakeConnection;

function setQueue(player: Player, tracks: ITrack[], position = 0): void {
    const internal = player as unknown as {
        playlist: { add(...items: ITrack[]): void; moveTo(p: number): unknown };
    };
    internal.playlist.add(...tracks);
    internal.playlist.moveTo(position);
}

beforeEach(() => {
    connection = { subscribe: vi.fn(), joinConfig: { channelId: "voice-guild-1" } };
    vi.mocked(getVoiceConnection)
        .mockReset()
        .mockImplementation(() => connection as never);
    vi.mocked(createAudioResource).mockClear();
    mocks.createStream
        .mockReset()
        .mockImplementation(async () => ({ stream: new PassThrough(), destroy: vi.fn() }));
    mocks.upsert.mockReset().mockResolvedValue({});
    mocks.joinVoice.mockReset().mockImplementation(() => okAsync(connection));
    mocks.getInfo.mockReset().mockImplementation((id: string) => okAsync(track(id)));
    (AudioPlayer as unknown as { restoreDone: boolean }).restoreDone = false;
});

afterEach(() => {
    for (const player of AudioPlayer.all) player.destroy();
});

describe("AudioPlayer registry", () => {
    it("should register itself for its guild", () => {
        const { guild } = fakeGuild();
        const player = new AudioPlayer(guild);

        expect(AudioPlayer.get("guild-1")).toBe(player);
        expect(AudioPlayer.all).toEqual([player]);
        expect(player.guildId).toBe("guild-1");
    });

    it("should throw when the guild already has a player", () => {
        const { guild } = fakeGuild();
        new AudioPlayer(guild);

        expect(() => new AudioPlayer(guild)).toThrow(
            "AudioPlayer already exists for guild guild-1",
        );
    });

    it("getOrCreate should return the existing player", () => {
        const { guild } = fakeGuild();
        const player = new AudioPlayer(guild);

        expect(AudioPlayer.getOrCreate(guild)).toBe(player);
    });

    it("getOrCreate should create a player that pauses without listeners", () => {
        const { guild } = fakeGuild();
        const player = AudioPlayer.getOrCreate(guild);

        expect(AudioPlayer.get("guild-1")).toBe(player);
        expect(discordPlayer(player).options?.behaviors?.noSubscriber).toBe(
            NoSubscriberBehavior.Pause,
        );
    });

    it("destroy should unregister the player and clear its queue", () => {
        const { guild } = fakeGuild();
        const player = new AudioPlayer(guild);
        setQueue(player, [track("a"), track("b")]);

        player.destroy();

        expect(AudioPlayer.get("guild-1")).toBeUndefined();
        expect(player.currentSong).toBeNull();
        expect(player.hasNext).toBe(false);
    });

    it("destroying an old player should not unregister its replacement", () => {
        const { guild } = fakeGuild();
        const old = new AudioPlayer(guild);
        old.destroy();
        const replacement = new AudioPlayer(guild);

        old.destroy();

        expect(AudioPlayer.get("guild-1")).toBe(replacement);
    });
});

describe("AudioPlayer play", () => {
    it("should join the channel and start the song when idle", async () => {
        const { guild, channel } = fakeGuild();
        const player = new AudioPlayer(guild);

        const res = await player.play("a", channel);

        expect(res._unsafeUnwrap()).toEqual({ track: track("a"), queued: false, position: 0 });
        expect(mocks.joinVoice).toHaveBeenCalledWith(channel.id, guild);
        expect(mocks.createStream).toHaveBeenCalledWith("a", undefined);
        expect(connection.subscribe).toHaveBeenCalledWith(discordPlayer(player));
        expect(discordPlayer(player).play).toHaveBeenCalledTimes(1);
        expect(player.currentSong).toEqual(track("a"));
        expect(player.playing).toBe(true);
    });

    it("should queue songs while one is playing", async () => {
        const { guild, channel } = fakeGuild();
        const player = new AudioPlayer(guild);
        await player.play("a", channel);

        const second = await player.play("b", channel);
        const third = await player.play("c", channel);

        expect(second._unsafeUnwrap()).toEqual({ track: track("b"), queued: true, position: 1 });
        expect(third._unsafeUnwrap()).toEqual({ track: track("c"), queued: true, position: 2 });
        expect(mocks.joinVoice).toHaveBeenCalledTimes(1);
        expect(player.currentSong).toEqual(track("a"));
    });

    it("should start the new song when the previous queue is over", async () => {
        const { guild, channel } = fakeGuild();
        const player = new AudioPlayer(guild);
        await player.play("a", channel);
        discordPlayer(player).setStatus(AudioPlayerStatus.Idle);

        const res = await player.play("b", channel);

        expect(res._unsafeUnwrap()).toEqual({ track: track("b"), queued: false, position: 0 });
        expect(player.currentSong).toEqual(track("b"));
    });

    it("should fail with a user-facing message when the song can't be loaded", async () => {
        const { guild, channel } = fakeGuild();
        const player = new AudioPlayer(guild);
        mocks.getInfo.mockReturnValue(errAsync("yt-dlp failed: private video"));

        const res = await player.play("a", channel);

        expect(res._unsafeUnwrapErr()).toBe("I couldn't load this song.");
        expect(mocks.joinVoice).not.toHaveBeenCalled();
    });

    it("should fail when the player is destroyed while loading the song", async () => {
        const { guild, channel } = fakeGuild();
        const player = new AudioPlayer(guild);
        let resolveInfo!: (info: ITrack) => void;
        mocks.getInfo.mockReturnValue(
            ResultAsync.fromSafePromise(new Promise<ITrack>((r) => (resolveInfo = r))),
        );

        const pending = player.play("a", channel);
        player.destroy();
        resolveInfo(track("a"));

        expect((await pending)._unsafeUnwrapErr()).toBe("The music was stopped in the meantime.");
        expect(mocks.joinVoice).not.toHaveBeenCalled();
    });

    it("should record the song in recently played", async () => {
        const { guild, channel } = fakeGuild();
        const player = new AudioPlayer(guild);

        await player.play("a", channel);

        expect(mocks.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { video_id: "a" },
                create: expect.objectContaining({ video_id: "a", title: "Title a" }),
            }),
        );
    });

    it("should still play when recording the song fails", async () => {
        const { guild, channel } = fakeGuild();
        const player = new AudioPlayer(guild);
        mocks.upsert.mockRejectedValue(new Error("db down"));

        const res = await player.play("a", channel);

        expect(res.isOk()).toBe(true);
    });

    it("should fail without a voice connection", async () => {
        const { guild, channel } = fakeGuild();
        const player = new AudioPlayer(guild);
        vi.mocked(getVoiceConnection).mockReturnValue(undefined);

        const res = await player.play("a", channel);

        expect(res._unsafeUnwrapErr()).toBe("No voice connection found for this guild.");
        expect(discordPlayer(player).play).not.toHaveBeenCalled();
    });
});

describe("AudioPlayer queue controls", () => {
    it("pause, resume and stop should drive the Discord player", async () => {
        const { guild, channel } = fakeGuild();
        const player = new AudioPlayer(guild);
        await player.play("a", channel);

        expect(player.pause()).toBe(true);
        expect(player.paused).toBe(true);
        expect(player.resume()).toBe(true);
        expect(player.playing).toBe(true);
        expect(player.stop()).toBe(true);
        expect(player.currentSong).toBeNull();
    });

    it("skip should play the next song", async () => {
        const { guild } = fakeGuild();
        const player = new AudioPlayer(guild);
        setQueue(player, [track("a"), track("b")]);

        const res = await player.skip();

        expect(res._unsafeUnwrap()).toEqual({ track: track("b"), skipped: [] });
        expect(mocks.createStream).toHaveBeenLastCalledWith("b", undefined);
    });

    it("skip should jump over songs that fail to start and list them", async () => {
        const { guild } = fakeGuild();
        const player = new AudioPlayer(guild);
        setQueue(player, [track("a"), track("b"), track("c")]);
        // b fails to start (no connection at that moment), the connection is back for c
        vi.mocked(getVoiceConnection).mockReturnValueOnce(undefined);

        const res = await player.skip();

        expect(res._unsafeUnwrap()).toEqual({ track: track("c"), skipped: [track("b")] });
    });

    it("skip should stop when none of the next songs starts", async () => {
        const { guild, channel } = fakeGuild();
        const player = new AudioPlayer(guild);
        await player.play("a", channel);
        await player.play("b", channel);
        vi.mocked(getVoiceConnection).mockReturnValueOnce(undefined);

        const res = await player.skip();

        expect(res._unsafeUnwrapErr()).toBe(
            "None of the next songs could be played, the queue is over.",
        );
        expect(discordPlayer(player).stop).toHaveBeenCalled();
        expect(player.playing).toBe(false);
    });

    it("skip should fail when there's no next song", async () => {
        const { guild } = fakeGuild();
        const player = new AudioPlayer(guild);
        setQueue(player, [track("a")]);

        const res = await player.skip();

        expect(res._unsafeUnwrapErr()).toBe("There's no next song in the queue.");
    });

    it("next should stop and fail at the end of the queue", async () => {
        const { guild } = fakeGuild();
        const player = new AudioPlayer(guild);
        setQueue(player, [track("a")]);

        const res = await player.next();

        expect(res._unsafeUnwrapErr()).toBe("No next track found.");
        expect(player.currentSong).toBeNull();
    });

    it("previous should play the previous song", async () => {
        const { guild } = fakeGuild();
        const player = new AudioPlayer(guild);
        setQueue(player, [track("a"), track("b")], 1);

        const res = await player.previous();

        expect(res._unsafeUnwrap()).toEqual(track("a"));
        expect(mocks.createStream).toHaveBeenLastCalledWith("a", undefined);
    });

    it("previous should stop and fail at the start of the queue", async () => {
        const { guild } = fakeGuild();
        const player = new AudioPlayer(guild);
        setQueue(player, [track("a"), track("b")]);

        const res = await player.previous();

        expect(res._unsafeUnwrapErr()).toBe("No previous track found.");
        expect(player.currentSong).toBeNull();
    });

    it("should play the next song by itself when the current one ends", async () => {
        const { guild, channel } = fakeGuild();
        const player = new AudioPlayer(guild);
        await player.play("a", channel);
        await player.play("b", channel);

        discordPlayer(player).setStatus(AudioPlayerStatus.Idle);

        await vi.waitFor(() => expect(player.currentSong).toEqual(track("b")));
        expect(mocks.createStream).toHaveBeenLastCalledWith("b", undefined);
    });
});

describe("AudioPlayer seek", () => {
    it("should fail without a current song", async () => {
        const { guild } = fakeGuild();
        const player = new AudioPlayer(guild);

        const res = await player.seek(new Second(10));

        expect(res._unsafeUnwrapErr()).toBe("No current song to seek.");
    });

    it("should fail past the end of the song", async () => {
        const { guild } = fakeGuild();
        const player = new AudioPlayer(guild);
        setQueue(player, [track("a", 100)]);

        const res = await player.seek(new Second(101));

        expect(res._unsafeUnwrapErr()).toBe("Seek time exceeds track duration.");
        expect(mocks.createStream).not.toHaveBeenCalled();
    });

    it("should restart the song at the given time", async () => {
        const { guild } = fakeGuild();
        const player = new AudioPlayer(guild);
        setQueue(player, [track("a", 100)]);

        const res = await player.seek(new Second(30));

        expect(res.isOk()).toBe(true);
        const [id, time] = mocks.createStream.mock.calls[0];
        expect(id).toBe("a");
        expect((time as Second).time).toBe(30);
        expect(player.positionMs.time).toBe(30_000);
    });
});

describe("AudioPlayer saveAll", () => {
    let savePath: string;

    beforeEach(() => {
        savePath = path.join(os.tmpdir(), `pijon-queue-${randomUUID()}.json`);
        testConfig.musicplayer.queue_save = { enabled: true, path: savePath };
    });

    afterEach(async () => {
        await fs.rm(savePath, { force: true });
    });

    it("should write nothing when saving is disabled", async () => {
        testConfig.musicplayer.queue_save.enabled = false;
        (AudioPlayer as unknown as { restoreDone: boolean }).restoreDone = true;

        const res = await AudioPlayer.saveAll();

        expect(res.isOk()).toBe(true);
        await expect(fs.access(savePath)).rejects.toThrow();
    });

    it("should keep the existing file before the queues were restored", async () => {
        await fs.writeFile(savePath, "previous save");

        const res = await AudioPlayer.saveAll();

        expect(res.isOk()).toBe(true);
        expect(await fs.readFile(savePath, "utf-8")).toBe("previous save");
    });

    it("should save only the players that are playing or paused", async () => {
        (AudioPlayer as unknown as { restoreDone: boolean }).restoreDone = true;
        const one = fakeGuild("guild-1");
        const two = fakeGuild("guild-2");
        const playing = new AudioPlayer(one.guild);
        await playing.play("a", one.channel);
        await playing.play("b", one.channel);
        (
            playing as unknown as { resource: { playbackDuration: number } }
        ).resource.playbackDuration = 5_000;
        playing.pause();
        const idle = new AudioPlayer(two.guild);
        setQueue(idle, [track("c")]);

        const res = await AudioPlayer.saveAll();

        expect(res.isOk()).toBe(true);
        const saved = JSON.parse(await fs.readFile(savePath, "utf-8"));
        expect(saved.items).toEqual([
            {
                guildId: "guild-1",
                channelId: one.channel.id,
                playlist: [track("a"), track("b")],
                position: 0,
                time: 5_000,
                paused: true,
            },
        ]);
        expect(typeof saved.savedAt).toBe("number");
    });
});

describe("AudioPlayer loadAll", () => {
    let savePath: string;

    function fakeClient(...guilds: Guild[]): Client {
        return { guilds: { cache: new Map(guilds.map((g) => [g.id, g])) } } as unknown as Client;
    }

    function saveFile(items: unknown[], savedAt = Date.now()): Promise<void> {
        return fs.writeFile(savePath, JSON.stringify({ items, savedAt }));
    }

    function restoreDone(): boolean {
        return (AudioPlayer as unknown as { restoreDone: boolean }).restoreDone;
    }

    beforeEach(() => {
        savePath = path.join(os.tmpdir(), `pijon-queue-${randomUUID()}.json`);
        testConfig.musicplayer.queue_save = { enabled: true, path: savePath };
    });

    afterEach(async () => {
        await fs.rm(savePath, { force: true });
    });

    it("should do nothing when saving is disabled", async () => {
        testConfig.musicplayer.queue_save.enabled = false;

        const res = await AudioPlayer.loadAll(fakeClient());

        expect(res.isOk()).toBe(true);
        expect(restoreDone()).toBe(true);
    });

    it("should succeed when there's no save file", async () => {
        const res = await AudioPlayer.loadAll(fakeClient());

        expect(res.isOk()).toBe(true);
        expect(restoreDone()).toBe(true);
    });

    it("should not restore queues saved more than an hour ago", async () => {
        const { guild, channel } = fakeGuild();
        await saveFile(
            [
                {
                    guildId: guild.id,
                    channelId: channel.id,
                    playlist: [track("a")],
                    position: 0,
                    time: 0,
                    paused: false,
                },
            ],
            Date.now() - 2 * 3600 * 1000,
        );

        const res = await AudioPlayer.loadAll(fakeClient(guild));

        expect(res.isOk()).toBe(true);
        expect(AudioPlayer.get(guild.id)).toBeUndefined();
        expect(mocks.joinVoice).not.toHaveBeenCalled();
    });

    it("should fail on an invalid file but still allow later saves", async () => {
        await fs.writeFile(savePath, "{not json");

        const res = await AudioPlayer.loadAll(fakeClient());

        expect(res._unsafeUnwrapErr()).toBe(
            "Invalid saved queues: Saved queues are not valid JSON",
        );
        expect(restoreDone()).toBe(true);
    });

    it("should report a guild that no longer exists", async () => {
        await saveFile([
            {
                guildId: "gone",
                channelId: "voice-gone",
                playlist: [track("a")],
                position: 0,
                time: 0,
                paused: false,
            },
        ]);

        const res = await AudioPlayer.loadAll(fakeClient());

        expect(res._unsafeUnwrapErr()).toBe("Guild gone not found");
        expect(restoreDone()).toBe(true);
    });

    it("should reject a queue position out of range", async () => {
        const { guild, channel } = fakeGuild();
        await saveFile([
            {
                guildId: guild.id,
                channelId: channel.id,
                playlist: [track("a")],
                position: 3,
                time: 0,
                paused: false,
            },
        ]);

        const res = await AudioPlayer.loadAll(fakeClient(guild));

        expect(res._unsafeUnwrapErr()).toBe("Invalid queue position 3 for guild guild-1");
        expect(AudioPlayer.get(guild.id)).toBeUndefined();
    });

    it("should rejoin and continue the current song where it stopped", async () => {
        const { guild, channel } = fakeGuild();
        await saveFile([
            {
                guildId: guild.id,
                channelId: channel.id,
                playlist: [track("a"), track("b")],
                position: 1,
                time: 42_000,
                paused: false,
            },
        ]);

        const res = await AudioPlayer.loadAll(fakeClient(guild));

        expect(res.isOk()).toBe(true);
        const player = AudioPlayer.get(guild.id)!;
        expect(player.currentSong).toEqual(track("b"));
        expect(player.hasPrevious).toBe(true);
        expect(mocks.joinVoice).toHaveBeenCalledWith(channel.id, guild);
        const [id, time] = mocks.createStream.mock.calls[0];
        expect(id).toBe("b");
        expect((time as Second).time).toBe(42);
        expect(player.playing).toBe(true);
    });

    it("should restore a paused queue as paused once it starts playing", async () => {
        const { guild, channel } = fakeGuild();
        await saveFile([
            {
                guildId: guild.id,
                channelId: channel.id,
                playlist: [track("a")],
                position: 0,
                time: 0,
                paused: true,
            },
        ]);

        const res = await AudioPlayer.loadAll(fakeClient(guild));

        expect(res.isOk()).toBe(true);
        expect(AudioPlayer.get(guild.id)!.paused).toBe(true);
    });

    it("should pause a restored queue only when it actually starts", async () => {
        const { guild, channel } = fakeGuild();
        const player = new AudioPlayer(guild);
        discordPlayer(player).autoPlay = false;
        setQueue(player, [track("a")]);
        const restore = (
            player as unknown as {
                restore(c: VoiceChannel, t: Second, p: boolean): ResultAsync<void, string>;
            }
        ).restore.bind(player);

        await restore(channel, new Second(0), true);
        expect(player.paused).toBe(false); // still buffering

        discordPlayer(player).setStatus(AudioPlayerStatus.Playing);
        expect(player.paused).toBe(true);
    });
});
