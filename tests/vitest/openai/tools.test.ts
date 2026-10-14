import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChannelType, Collection } from "discord.js";
import { errAsync, okAsync } from "neverthrow";
import { runTool, toolsFor, type ToolContext } from "../../../src/openai/tools/index.js";
import { fakeChannel, fakeMessage, fakeUser, fetchedPage } from "../fakes/discord.js";

const mocks = vi.hoisted(() => ({
    AudioPlayer: { get: vi.fn(), getOrCreate: vi.fn() },
    resolveTrackId: vi.fn(),
    leaveVoice: vi.fn(),
    addMemory: vi.fn(),
    deleteMemory: vi.fn(),
}));

vi.mock("../../../src/music-player/AudioPlayer.js", () => ({ AudioPlayer: mocks.AudioPlayer }));
vi.mock("../../../src/music-player/resolve.js", () => ({ resolveTrackId: mocks.resolveTrackId }));
vi.mock("../../../src/voice.js", () => ({ leaveVoice: mocks.leaveVoice }));
vi.mock("../../../src/openai/memory.js", () => ({
    addMemory: mocks.addMemory,
    deleteMemory: mocks.deleteMemory,
}));

const GUILD_ONLY = ["music_play", "music_control", "leave_voice"];
const EVERYWHERE = ["search_history", "remember", "forget"];

beforeEach(() => {
    mocks.AudioPlayer.get.mockReset();
    mocks.AudioPlayer.getOrCreate.mockReset();
    mocks.resolveTrackId.mockReset();
    mocks.leaveVoice.mockReset();
    mocks.addMemory.mockReset();
    mocks.deleteMemory.mockReset();
});

function ctx(message = fakeMessage()): ToolContext {
    return { message, contextStartId: message.id };
}

function call(name: string, args: unknown, context: ToolContext = ctx()) {
    return runTool(name, JSON.stringify(args), context);
}

function names(tools: ReturnType<typeof toolsFor>): string[] {
    return tools.map((t) => ("name" in t ? t.name : t.type));
}

describe("toolsFor", () => {
    it("gives every tool plus web search in a server", () => {
        const tools = toolsFor(fakeMessage({ guildId: "g" }));
        expect(names(tools).sort()).toEqual([...GUILD_ONLY, ...EVERYWHERE, "web_search"].sort());
    });

    it("hides the server-only tools in DMs", () => {
        const tools = toolsFor(fakeMessage({ guildId: null }));
        expect(names(tools).sort()).toEqual([...EVERYWHERE, "web_search"].sort());
    });

    it("builds strict function tools from the zod schemas", () => {
        const tools = toolsFor(fakeMessage());
        const forget = tools.find((t) => "name" in t && t.name === "forget") as Record<
            string,
            unknown
        >;
        expect(forget.type).toBe("function");
        expect(forget.strict).toBe(true);
        expect(forget.parameters).toMatchObject({
            type: "object",
            properties: { id: { type: "integer" } },
            required: ["id"],
        });
    });
});

describe("runTool", () => {
    it("rejects an unknown tool", async () => {
        const res = await runTool("hack_the_planet", "{}", ctx());
        expect(res._unsafeUnwrapErr()).toBe("Unknown tool hack_the_planet");
    });

    it("rejects arguments that aren't JSON", async () => {
        const res = await runTool("forget", "{id:", ctx());
        expect(res._unsafeUnwrapErr()).toBe("Arguments are not valid JSON");
    });

    it("rejects arguments that don't match the schema", async () => {
        const res = await call("forget", { id: "three" });
        expect(res.isErr()).toBe(true);
        expect(mocks.deleteMemory).not.toHaveBeenCalled();
    });

    it("runs the tool with the parsed arguments", async () => {
        mocks.deleteMemory.mockReturnValue(okAsync(true));
        const res = await call("forget", { id: 3 });
        expect(res._unsafeUnwrap()).toBe("Deleted #3.");
        expect(mocks.deleteMemory).toHaveBeenCalledWith("guild-1", 3);
    });
});

describe("music_play", () => {
    const voiceChannel = { id: "vc", type: ChannelType.GuildVoice };

    function inVoice(channel: unknown = voiceChannel) {
        return fakeMessage({ member: { voice: { channel } } });
    }

    it("fails when the user isn't in a voice channel and nothing plays", async () => {
        mocks.AudioPlayer.get.mockReturnValue(undefined);

        const res = await call("music_play", { query: "lofi" }, ctx(fakeMessage({ member: null })));

        expect(res._unsafeUnwrapErr()).toBe("The user is not in a voice channel.");
        expect(mocks.resolveTrackId).not.toHaveBeenCalled();
    });

    it("fails for a channel that isn't a voice channel", async () => {
        const stage = { id: "st", type: ChannelType.GuildStageVoice };

        const res = await call("music_play", { query: "lofi" }, ctx(inVoice(stage)));

        expect(res._unsafeUnwrapErr()).toBe("The user is not in a voice channel.");
    });

    it("plays in the user's voice channel", async () => {
        const play = vi.fn(() => okAsync({ track: { title: "Lofi" }, queued: false, position: 0 }));
        mocks.resolveTrackId.mockReturnValue(okAsync("vid"));
        mocks.AudioPlayer.getOrCreate.mockReturnValue({ play });
        const message = inVoice();

        const res = await call("music_play", { query: "lofi" }, ctx(message));

        expect(res._unsafeUnwrap()).toBe('Now playing "Lofi".');
        expect(mocks.resolveTrackId).toHaveBeenCalledWith("lofi");
        expect(mocks.AudioPlayer.getOrCreate).toHaveBeenCalledWith(message.guild);
        expect(play).toHaveBeenCalledWith("vid", voiceChannel);
    });

    it("says where the song was queued", async () => {
        mocks.resolveTrackId.mockReturnValue(okAsync("vid"));
        mocks.AudioPlayer.getOrCreate.mockReturnValue({
            play: () => okAsync({ track: { title: "Lofi" }, queued: true, position: 2 }),
        });

        const res = await call("music_play", { query: "lofi" }, ctx(inVoice()));

        expect(res._unsafeUnwrap()).toBe('Queued "Lofi" at position 2.');
    });

    it("falls back to the channel the bot is already playing in", async () => {
        const play = vi.fn(() => okAsync({ track: { title: "x" }, queued: true, position: 1 }));
        mocks.AudioPlayer.get.mockReturnValue({ voiceChannel });
        mocks.AudioPlayer.getOrCreate.mockReturnValue({ play });
        mocks.resolveTrackId.mockReturnValue(okAsync("vid"));

        const res = await call("music_play", { query: "x" }, ctx(fakeMessage({ member: null })));

        expect(res.isOk()).toBe(true);
        expect(play).toHaveBeenCalledWith("vid", voiceChannel);
    });

    it("passes on search errors", async () => {
        mocks.resolveTrackId.mockReturnValue(errAsync("No results for *zzz*."));

        const res = await call("music_play", { query: "zzz" }, ctx(inVoice()));

        expect(res._unsafeUnwrapErr()).toBe("No results for *zzz*.");
        expect(mocks.AudioPlayer.getOrCreate).not.toHaveBeenCalled();
    });

    it("passes on play errors", async () => {
        mocks.resolveTrackId.mockReturnValue(okAsync("vid"));
        mocks.AudioPlayer.getOrCreate.mockReturnValue({
            play: () => errAsync("I couldn't load this song."),
        });

        const res = await call("music_play", { query: "x" }, ctx(inVoice()));

        expect(res._unsafeUnwrapErr()).toBe("I couldn't load this song.");
    });
});

describe("music_control", () => {
    function player(overrides: Record<string, unknown> = {}) {
        return {
            currentSong: { title: "Lofi" },
            paused: false,
            pause: vi.fn(() => true),
            resume: vi.fn(() => true),
            stop: vi.fn(() => true),
            skip: vi.fn(() => okAsync({ track: { title: "Next" }, skipped: [] })),
            previous: vi.fn(() => okAsync({ title: "Prev" })),
            ...overrides,
        };
    }

    it("fails when there's no player", async () => {
        mocks.AudioPlayer.get.mockReturnValue(undefined);
        const res = await call("music_control", { action: "pause" });
        expect(res._unsafeUnwrapErr()).toBe("Nothing is playing.");
    });

    it("fails when the player has no current song", async () => {
        mocks.AudioPlayer.get.mockReturnValue(player({ currentSong: null }));
        const res = await call("music_control", { action: "pause" });
        expect(res._unsafeUnwrapErr()).toBe("Nothing is playing.");
    });

    it("pauses", async () => {
        const p = player();
        mocks.AudioPlayer.get.mockReturnValue(p);
        expect((await call("music_control", { action: "pause" }))._unsafeUnwrap()).toBe("Paused.");
        expect(p.pause).toHaveBeenCalled();
    });

    it("says when it was already paused", async () => {
        mocks.AudioPlayer.get.mockReturnValue(player({ pause: () => false }));
        const res = await call("music_control", { action: "pause" });
        expect(res._unsafeUnwrap()).toBe("Already paused.");
    });

    it("resumes, or says it wasn't paused", async () => {
        mocks.AudioPlayer.get.mockReturnValue(player());
        expect((await call("music_control", { action: "resume" }))._unsafeUnwrap()).toBe(
            "Resumed.",
        );

        mocks.AudioPlayer.get.mockReturnValue(player({ resume: () => false }));
        expect((await call("music_control", { action: "resume" }))._unsafeUnwrap()).toBe(
            "It wasn't paused.",
        );
    });

    it("stops and clears the queue", async () => {
        const p = player();
        mocks.AudioPlayer.get.mockReturnValue(p);
        const res = await call("music_control", { action: "stop" });
        expect(res._unsafeUnwrap()).toBe("Stopped and cleared the queue.");
        expect(p.stop).toHaveBeenCalled();
    });

    it("skips to the next song", async () => {
        mocks.AudioPlayer.get.mockReturnValue(player());
        const res = await call("music_control", { action: "skip" });
        expect(res._unsafeUnwrap()).toBe('Now playing "Next".');
    });

    it("passes on skip errors", async () => {
        mocks.AudioPlayer.get.mockReturnValue(
            player({ skip: () => errAsync("There's no next song in the queue.") }),
        );
        const res = await call("music_control", { action: "skip" });
        expect(res._unsafeUnwrapErr()).toBe("There's no next song in the queue.");
    });

    it("goes back to the previous song", async () => {
        mocks.AudioPlayer.get.mockReturnValue(player());
        const res = await call("music_control", { action: "previous" });
        expect(res._unsafeUnwrap()).toBe('Now playing "Prev".');
    });

    it("tells what's playing, and whether it's paused", async () => {
        mocks.AudioPlayer.get.mockReturnValue(player());
        expect((await call("music_control", { action: "now_playing" }))._unsafeUnwrap()).toBe(
            '"Lofi".',
        );

        mocks.AudioPlayer.get.mockReturnValue(player({ paused: true }));
        expect((await call("music_control", { action: "now_playing" }))._unsafeUnwrap()).toBe(
            '"Lofi" (paused).',
        );
    });

    it("rejects an unknown action", async () => {
        mocks.AudioPlayer.get.mockReturnValue(player());
        const res = await call("music_control", { action: "explode" });
        expect(res.isErr()).toBe(true);
    });
});

describe("leave_voice", () => {
    it("leaves the voice channel", async () => {
        mocks.leaveVoice.mockReturnValue(true);
        const res = await call("leave_voice", {}, ctx(fakeMessage({ guildId: "g9" })));
        expect(res._unsafeUnwrap()).toBe("Left the voice channel.");
        expect(mocks.leaveVoice).toHaveBeenCalledWith("g9");
    });

    it("fails when the bot isn't in a voice channel", async () => {
        mocks.leaveVoice.mockReturnValue(false);
        const res = await call("leave_voice", {});
        expect(res._unsafeUnwrapErr()).toBe("I'm not in a voice channel.");
    });
});

describe("search_history", () => {
    function history(messages: ReturnType<typeof fakeMessage>[]) {
        const channel = fakeChannel();
        channel.messages.fetch
            .mockResolvedValueOnce(fetchedPage(messages))
            .mockResolvedValue(new Collection());
        const message = fakeMessage({ channel });
        return { channel, context: { message, contextStartId: "777" } };
    }

    const bob = fakeUser({ displayName: "Bob" });
    const alice = fakeUser({ displayName: "Alice" });

    it("searches before the oldest message in context", async () => {
        const { channel, context } = history([]);

        await call("search_history", { query: null, author: null }, context);

        expect(channel.messages.fetch).toHaveBeenCalledWith({ before: "777", limit: 100 });
    });

    it("filters by keyword, ignoring case", async () => {
        const { context } = history([
            fakeMessage({ author: bob, content: "J'adore la PIZZA" }),
            fakeMessage({ author: bob, content: "les pâtes c'est mieux" }),
        ]);

        const res = await call("search_history", { query: "pizza", author: null }, context);

        expect(res._unsafeUnwrap()).toContain("[Bob] J'adore la PIZZA");
        expect(res._unsafeUnwrap()).not.toContain("pâtes");
    });

    it("filters by author name", async () => {
        const { context } = history([
            fakeMessage({ author: bob, content: "from bob" }),
            fakeMessage({ author: alice, content: "from alice" }),
        ]);

        const res = await call("search_history", { query: null, author: "ali" }, context);

        expect(res._unsafeUnwrap()).toContain("from alice");
        expect(res._unsafeUnwrap()).not.toContain("from bob");
    });

    it("prefixes each match with its date", async () => {
        const { context } = history([
            fakeMessage({
                author: bob,
                content: "hello",
                createdAt: new Date("2026-09-01T08:30:00Z"),
            }),
        ]);

        const res = await call("search_history", { query: null, author: null }, context);

        expect(res._unsafeUnwrap()).toBe("2026-09-01T08:30 [Bob] hello");
    });

    it("returns the 20 most recent matches", async () => {
        const messages = Array.from({ length: 25 }, (_, i) =>
            fakeMessage({ author: bob, content: `msg ${i}` }),
        );
        const { context } = history(messages);

        const res = await call("search_history", { query: "msg", author: null }, context);
        const lines = res._unsafeUnwrap().split("\n");

        expect(lines).toHaveLength(20);
        expect(lines[0]).toContain("msg 5");
        expect(lines[19]).toContain("msg 24");
    });

    it("says when nothing matches", async () => {
        const { context } = history([fakeMessage({ author: bob, content: "hello" })]);

        const res = await call("search_history", { query: "pizza", author: null }, context);

        expect(res._unsafeUnwrap()).toBe("No matching messages.");
    });

    it("passes on fetch errors", async () => {
        const channel = fakeChannel();
        channel.messages.fetch.mockRejectedValue(new Error("Missing Access"));
        const message = fakeMessage({ channel });

        const res = await call(
            "search_history",
            { query: null, author: null },
            { message, contextStartId: "1" },
        );

        expect(res._unsafeUnwrapErr()).toContain("Failed to fetch history");
    });
});

describe("remember", () => {
    it("saves a fact about the author in the server", async () => {
        mocks.addMemory.mockReturnValue(okAsync(12));
        const author = fakeUser();
        const message = fakeMessage({ author, guildId: "g1" });

        const res = await call(
            "remember",
            { content: "aime le jazz", about_author: true },
            ctx(message),
        );

        expect(res._unsafeUnwrap()).toBe("Saved as #12.");
        expect(mocks.addMemory).toHaveBeenCalledWith("g1", author.id, "aime le jazz");
    });

    it("saves a general fact without a user", async () => {
        mocks.addMemory.mockReturnValue(okAsync(13));

        await call("remember", { content: "le serveur a 3 ans", about_author: false });

        expect(mocks.addMemory).toHaveBeenCalledWith("guild-1", null, "le serveur a 3 ans");
    });

    it("scopes DM memories to the DM channel", async () => {
        mocks.addMemory.mockReturnValue(okAsync(14));
        const message = fakeMessage({ guildId: null });

        await call("remember", { content: "x", about_author: false }, ctx(message));

        expect(mocks.addMemory).toHaveBeenCalledWith(message.channelId, null, "x");
    });

    it("passes on save errors", async () => {
        mocks.addMemory.mockReturnValue(errAsync("Failed to save memory: db down"));
        const res = await call("remember", { content: "x", about_author: false });
        expect(res._unsafeUnwrapErr()).toBe("Failed to save memory: db down");
    });
});

describe("forget", () => {
    it("says when the memory doesn't exist", async () => {
        mocks.deleteMemory.mockReturnValue(okAsync(false));
        const res = await call("forget", { id: 5 });
        expect(res._unsafeUnwrap()).toBe("No memory #5.");
    });

    it("scopes DM deletes to the DM channel", async () => {
        mocks.deleteMemory.mockReturnValue(okAsync(true));
        const message = fakeMessage({ guildId: null });

        await call("forget", { id: 5 }, ctx(message));

        expect(mocks.deleteMemory).toHaveBeenCalledWith(message.channelId, 5);
    });
});
