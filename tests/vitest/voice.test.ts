import { EventEmitter } from "events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Collection } from "discord.js";
import { VOICE_ALONE_TIMEOUT_MS, VOICE_READY_TIMEOUT_MS } from "../../src/consts.js";

const Status = {
    Signalling: "signalling",
    Connecting: "connecting",
    Ready: "ready",
    Disconnected: "disconnected",
    Destroyed: "destroyed",
} as const;

class FakeConnection extends EventEmitter {
    public state: { status: string };
    public joinConfig: { channelId: string | null; selfDeaf: boolean; selfMute: boolean };
    public rejoin = vi.fn((config: { channelId: string }) => {
        this.joinConfig = { ...this.joinConfig, ...config };
        return true;
    });
    public destroy = vi.fn(() => {
        this.state = { status: Status.Destroyed };
        this.emit(Status.Destroyed);
    });

    constructor(channelId: string, status: string = Status.Ready) {
        super();
        this.state = { status };
        this.joinConfig = { channelId, selfDeaf: true, selfMute: false };
    }
}

const voice = vi.hoisted(() => ({
    connections: new Map<string, unknown>(),
    /** What entersState() does for each target status, default: reach it */
    outcome: {} as Record<string, "resolve" | "reject" | "pending">,
}));

vi.mock("@discordjs/voice", () => ({
    VoiceConnectionStatus: {
        Signalling: "signalling",
        Connecting: "connecting",
        Ready: "ready",
        Disconnected: "disconnected",
        Destroyed: "destroyed",
    },
    getVoiceConnection: (guildId: string) => voice.connections.get(guildId),
    joinVoiceChannel: vi.fn(),
    entersState: vi.fn(),
}));

vi.mock("../../src/music-player/AudioPlayer.js", () => ({
    AudioPlayer: { get: vi.fn() },
}));

const { entersState, joinVoiceChannel } = await import("@discordjs/voice");
const { AudioPlayer } = await import("../../src/music-player/AudioPlayer.js");
const { joinVoice, leaveVoice, handleVoiceStateUpdate } = await import("../../src/voice.js");

const BOT_ID = "bot";
let guildCount = 0;

interface VoiceMember {
    id: string;
    channelId: string | null;
    bot?: boolean;
}

/** A guild whose voice states can be changed by the test */
function fakeGuild(botChannelId: string | null = null) {
    guildCount++;
    const states = new Collection<string, unknown>();
    const guild = {
        id: `guild-${guildCount}`,
        voiceAdapterCreator: {},
        client: { user: { id: BOT_ID } },
        voiceStates: { cache: states },
        members: { me: { voice: { channelId: botChannelId } } },
        setMember(member: VoiceMember) {
            states.set(member.id, {
                id: member.id,
                channelId: member.channelId,
                member: { user: { bot: member.bot ?? false } },
            });
        },
        setBotChannel(channelId: string | null) {
            guild.members.me.voice.channelId = channelId;
            states.set(BOT_ID, {
                id: BOT_ID,
                channelId,
                member: { user: { bot: true } },
            });
        },
    };
    if (botChannelId) guild.setBotChannel(botChannelId);
    return guild;
}

function connect(guild: { id: string }, channelId: string, status: string = Status.Ready) {
    const conn = new FakeConnection(channelId, status);
    voice.connections.set(guild.id, conn);
    return conn;
}

function stateUpdate(guild: unknown, oldChannelId: string | null, newChannelId: string | null) {
    handleVoiceStateUpdate(
        { channelId: oldChannelId, guild } as never,
        { channelId: newChannelId, guild } as never,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    voice.connections.clear();
    voice.outcome = {};

    vi.mocked(joinVoiceChannel).mockImplementation(((options: {
        channelId: string;
        guildId: string;
    }) => {
        const conn = new FakeConnection(options.channelId, Status.Signalling);
        voice.connections.set(options.guildId, conn);
        return conn;
    }) as never);

    vi.mocked(entersState).mockImplementation((async (conn: FakeConnection, status: string) => {
        const outcome = voice.outcome[status] ?? "resolve";
        if (outcome === "reject") throw new Error(`Timed out waiting for ${status}`);
        if (outcome === "pending") return new Promise(() => {});
        conn.state = { status };
        return conn;
    }) as never);

    vi.mocked(AudioPlayer.get).mockReturnValue(undefined);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("joinVoice", () => {
    it("joins and waits for the connection to be ready when not connected", async () => {
        const guild = fakeGuild();

        const res = await joinVoice("channel-1", guild as never);

        expect(res.isOk()).toBe(true);
        expect(joinVoiceChannel).toHaveBeenCalledWith({
            channelId: "channel-1",
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });
        const conn = voice.connections.get(guild.id);
        expect(entersState).toHaveBeenCalledWith(conn, Status.Ready, VOICE_READY_TIMEOUT_MS);
        expect(res._unsafeUnwrap()).toBe(conn);
    });

    it("destroys the connection and returns a user-facing error when it never gets ready", async () => {
        const guild = fakeGuild();
        voice.outcome[Status.Ready] = "reject";

        const res = await joinVoice("channel-1", guild as never);

        expect(res._unsafeUnwrapErr()).toBe("I couldn't connect to the voice channel.");
        const conn = voice.connections.get(guild.id) as FakeConnection;
        expect(conn.destroy).toHaveBeenCalledTimes(1);
    });

    it("returns the existing connection when already ready in the same channel", async () => {
        const guild = fakeGuild();
        const conn = connect(guild, "channel-1");

        const res = await joinVoice("channel-1", guild as never);

        expect(res._unsafeUnwrap()).toBe(conn);
        expect(joinVoiceChannel).not.toHaveBeenCalled();
        expect(entersState).not.toHaveBeenCalled();
        expect(conn.rejoin).not.toHaveBeenCalled();
    });

    it("refuses to move while playing to listeners in another channel", async () => {
        const guild = fakeGuild("old-channel");
        guild.setMember({ id: "user-1", channelId: "old-channel" });
        const conn = connect(guild, "old-channel");
        vi.mocked(AudioPlayer.get).mockReturnValue({ playing: true, paused: false } as never);

        const res = await joinVoice("new-channel", guild as never);

        expect(res._unsafeUnwrapErr()).toBe("I'm already playing in <#old-channel>.");
        expect(conn.rejoin).not.toHaveBeenCalled();
    });

    it("refuses to move while paused with listeners in another channel", async () => {
        const guild = fakeGuild("old-channel");
        guild.setMember({ id: "user-1", channelId: "old-channel" });
        connect(guild, "old-channel");
        vi.mocked(AudioPlayer.get).mockReturnValue({ playing: false, paused: true } as never);

        const res = await joinVoice("new-channel", guild as never);

        expect(res.isErr()).toBe(true);
    });

    it("moves when the music plays to nobody but bots", async () => {
        const guild = fakeGuild("old-channel");
        guild.setMember({ id: "other-bot", channelId: "old-channel", bot: true });
        const conn = connect(guild, "old-channel");
        vi.mocked(AudioPlayer.get).mockReturnValue({ playing: true, paused: false } as never);

        const res = await joinVoice("new-channel", guild as never);

        expect(res._unsafeUnwrap()).toBe(conn);
        expect(conn.rejoin).toHaveBeenCalledWith({
            channelId: "new-channel",
            selfDeaf: true,
            selfMute: false,
        });
        expect(entersState).toHaveBeenCalledWith(conn, Status.Ready, VOICE_READY_TIMEOUT_MS);
    });

    it("moves when nothing is playing, even with listeners", async () => {
        const guild = fakeGuild("old-channel");
        guild.setMember({ id: "user-1", channelId: "old-channel" });
        const conn = connect(guild, "old-channel");

        const res = await joinVoice("new-channel", guild as never);

        expect(res.isOk()).toBe(true);
        expect(conn.rejoin).toHaveBeenCalledTimes(1);
    });

    it("waits for a connection that is still connecting", async () => {
        const guild = fakeGuild();
        const conn = connect(guild, "channel-1", Status.Connecting);

        const res = await joinVoice("channel-1", guild as never);

        expect(res._unsafeUnwrap()).toBe(conn);
        expect(entersState).toHaveBeenCalledWith(conn, Status.Ready, VOICE_READY_TIMEOUT_MS);
        expect(joinVoiceChannel).not.toHaveBeenCalled();
    });
});

describe("connection watcher", () => {
    it("destroys the guild's audio player when the connection is destroyed", async () => {
        const guild = fakeGuild();
        const player = { destroy: vi.fn() };
        vi.mocked(AudioPlayer.get).mockReturnValue(player as never);
        await joinVoice("channel-1", guild as never);
        const conn = voice.connections.get(guild.id) as FakeConnection;

        conn.destroy();

        expect(AudioPlayer.get).toHaveBeenCalledWith(guild.id);
        expect(player.destroy).toHaveBeenCalledTimes(1);
    });

    it("destroys the connection when a disconnect doesn't reconnect", async () => {
        const guild = fakeGuild();
        await joinVoice("channel-1", guild as never);
        const conn = voice.connections.get(guild.id) as FakeConnection;
        voice.outcome[Status.Signalling] = "reject";
        voice.outcome[Status.Connecting] = "reject";

        conn.emit(Status.Disconnected);

        await vi.waitFor(() => expect(conn.destroy).toHaveBeenCalledTimes(1));
    });

    it("keeps the connection when a disconnect is a move to another channel", async () => {
        const guild = fakeGuild();
        await joinVoice("channel-1", guild as never);
        const conn = voice.connections.get(guild.id) as FakeConnection;
        voice.outcome[Status.Signalling] = "resolve";
        voice.outcome[Status.Connecting] = "pending";

        conn.emit(Status.Disconnected);
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(conn.destroy).not.toHaveBeenCalled();
    });
});

describe("leaveVoice", () => {
    it("returns false when not connected", () => {
        expect(leaveVoice(fakeGuild().id)).toBe(false);
    });

    it("destroys the connection and returns true", () => {
        const guild = fakeGuild();
        const conn = connect(guild, "channel-1");

        expect(leaveVoice(guild.id)).toBe(true);
        expect(conn.destroy).toHaveBeenCalledTimes(1);
    });

    it("doesn't destroy an already destroyed connection", () => {
        const guild = fakeGuild();
        const conn = connect(guild, "channel-1", Status.Destroyed);

        expect(leaveVoice(guild.id)).toBe(true);
        expect(conn.destroy).not.toHaveBeenCalled();
    });
});

describe("handleVoiceStateUpdate", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it("does nothing when the bot isn't connected in the guild", () => {
        const guild = fakeGuild("channel-1");

        stateUpdate(guild, "channel-1", null);

        expect(vi.getTimerCount()).toBe(0);
    });

    it("does nothing when the bot isn't in a voice channel", () => {
        const guild = fakeGuild(null);
        connect(guild, "channel-1");

        stateUpdate(guild, "channel-1", null);

        expect(vi.getTimerCount()).toBe(0);
    });

    it("leaves after the timeout once the bot is alone", () => {
        const guild = fakeGuild("channel-1");
        const conn = connect(guild, "channel-1");

        stateUpdate(guild, "channel-1", null);

        vi.advanceTimersByTime(VOICE_ALONE_TIMEOUT_MS - 1);
        expect(conn.destroy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(conn.destroy).toHaveBeenCalledTimes(1);
    });

    it("cancels the timer when someone joins", () => {
        const guild = fakeGuild("channel-1");
        const conn = connect(guild, "channel-1");
        stateUpdate(guild, "channel-1", null);

        guild.setMember({ id: "user-1", channelId: "channel-1" });
        stateUpdate(guild, null, "channel-1");

        vi.advanceTimersByTime(VOICE_ALONE_TIMEOUT_MS);
        expect(conn.destroy).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });

    it("doesn't count other bots as listeners", () => {
        const guild = fakeGuild("channel-1");
        guild.setMember({ id: "other-bot", channelId: "channel-1", bot: true });
        const conn = connect(guild, "channel-1");

        stateUpdate(guild, null, "channel-1");

        vi.advanceTimersByTime(VOICE_ALONE_TIMEOUT_MS);
        expect(conn.destroy).toHaveBeenCalledTimes(1);
    });

    it("ignores changes in other channels", () => {
        const guild = fakeGuild("channel-1");
        connect(guild, "channel-1");

        stateUpdate(guild, "channel-2", "channel-3");

        expect(vi.getTimerCount()).toBe(0);
    });

    it("starts only one timer per guild", () => {
        const guild = fakeGuild("channel-1");
        connect(guild, "channel-1");

        stateUpdate(guild, "channel-1", null);
        stateUpdate(guild, "channel-1", null);

        expect(vi.getTimerCount()).toBe(1);
    });

    it("stays when a listener came back without an update reaching the handler", () => {
        const guild = fakeGuild("channel-1");
        const conn = connect(guild, "channel-1");
        stateUpdate(guild, "channel-1", null);

        guild.setMember({ id: "user-1", channelId: "channel-1" });
        vi.advanceTimersByTime(VOICE_ALONE_TIMEOUT_MS);

        expect(conn.destroy).not.toHaveBeenCalled();
    });

    it("clears the timer when the connection is destroyed", async () => {
        const guild = fakeGuild("channel-1");
        await joinVoice("channel-1", guild as never);
        const conn = voice.connections.get(guild.id) as FakeConnection;
        stateUpdate(guild, "channel-1", null);
        expect(vi.getTimerCount()).toBe(1);

        conn.destroy();

        expect(vi.getTimerCount()).toBe(0);
    });
});
