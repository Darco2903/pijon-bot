import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { Message } from "discord.js";
import { handleMessageCreate } from "../../../src/openai/message.js";
import { logger } from "../../../src/logger.js";
import { AI_DECISION_WINDOW } from "../../../src/consts.js";
import { testConfig } from "../fakes/config.js";
import { BOT_ID, botUser, fakeChannel, fakeMessage, fakeUser } from "../fakes/discord.js";

const m = vi.hoisted(() => ({
    fetchSince: vi.fn(),
    shouldRespond: vi.fn(),
    getState: vi.fn(),
    getMemories: vi.fn(),
    compact: vi.fn(),
    respond: vi.fn(),
}));

vi.mock("../../../src/openai/context.js", () => ({ fetchSince: m.fetchSince }));
vi.mock("../../../src/openai/decide.js", () => ({ shouldRespond: m.shouldRespond }));
vi.mock("../../../src/openai/memory.js", () => ({
    getState: m.getState,
    getMemories: m.getMemories,
    compact: m.compact,
}));
vi.mock("../../../src/openai/respond.js", () => ({ respond: m.respond }));

const STATE = { summary: "", cursorId: null };

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
}

/** Lets pending promise chains run */
async function flush(times = 5) {
    for (let i = 0; i < times; i++) await new Promise((r) => setImmediate(r));
}

/** A message in a channel the bot watches */
function watched(options: Parameters<typeof fakeMessage>[0] = {}): Message {
    const message = fakeMessage(options);
    testConfig.ai.channels.push(message.channelId);
    return message;
}

const mention = { mentionedUserIds: [BOT_ID] };

beforeEach(() => {
    for (const fn of Object.values(m)) fn.mockReset();
    m.getState.mockReturnValue(okAsync(STATE));
    m.getMemories.mockReturnValue(okAsync([]));
    m.fetchSince.mockReturnValue(okAsync([]));
    m.shouldRespond.mockReturnValue(okAsync(false));
    m.compact.mockReturnValue(okAsync(undefined));
    m.respond.mockReturnValue(okAsync("salut"));
    vi.mocked(logger.error).mockClear();
});

afterEach(() => {
    vi.useRealTimers();
});

describe("which messages get handled", () => {
    it("ignores bots, even when they mention the bot", async () => {
        await handleMessageCreate(fakeMessage({ author: fakeUser({ bot: true }), ...mention }));
        expect(m.getState).not.toHaveBeenCalled();
    });

    it("ignores a normal message in a channel it doesn't watch", async () => {
        await handleMessageCreate(fakeMessage({ content: "salut tout le monde" }));
        expect(m.getState).not.toHaveBeenCalled();
    });

    it("ignores a reply to someone else in a channel it doesn't watch", async () => {
        await handleMessageCreate(fakeMessage({ repliedUser: fakeUser() }));
        expect(m.getState).not.toHaveBeenCalled();
    });

    it("answers DMs without asking the classifier", async () => {
        const message = fakeMessage({ guildId: null });

        await handleMessageCreate(message);

        expect(m.shouldRespond).not.toHaveBeenCalled();
        expect(m.respond).toHaveBeenCalledOnce();
        expect(message.reply).toHaveBeenCalledOnce();
    });

    it("answers a mention in any channel without asking the classifier", async () => {
        const message = fakeMessage(mention);

        await handleMessageCreate(message);

        expect(m.shouldRespond).not.toHaveBeenCalled();
        expect(message.reply).toHaveBeenCalledOnce();
    });

    it("answers a reply to the bot without asking the classifier", async () => {
        const message = fakeMessage({ repliedUser: botUser() });

        await handleMessageCreate(message);

        expect(m.shouldRespond).not.toHaveBeenCalled();
        expect(message.reply).toHaveBeenCalledOnce();
    });

    it("asks the classifier about the last messages in a watched channel", async () => {
        const message = watched();
        const tail = Array.from({ length: AI_DECISION_WINDOW + 5 }, () =>
            fakeMessage({ channel: message.channel as never }),
        );
        m.fetchSince.mockReturnValue(okAsync(tail));
        m.shouldRespond.mockReturnValue(okAsync(true));

        await handleMessageCreate(message);

        expect(m.shouldRespond).toHaveBeenCalledWith(tail.slice(-AI_DECISION_WINDOW));
        expect(m.respond).toHaveBeenCalledOnce();
        expect(message.reply).toHaveBeenCalledOnce();
    });

    it("stays quiet when the classifier says no, but still compacts", async () => {
        const message = watched();
        const tail = [fakeMessage()];
        m.fetchSince.mockReturnValue(okAsync(tail));
        m.shouldRespond.mockReturnValue(okAsync(false));

        await handleMessageCreate(message);

        expect(m.respond).not.toHaveBeenCalled();
        expect(message.reply).not.toHaveBeenCalled();
        expect(m.compact).toHaveBeenCalledWith(message.channelId, tail, STATE);
    });
});

describe("a turn", () => {
    it("loads the channel state, the server's memories and the messages since the cursor", async () => {
        const state = { summary: "s", cursorId: "42" };
        const memories = [{ id: 1, content: "fact" }];
        const tail = [fakeMessage()];
        m.getState.mockReturnValue(okAsync(state));
        m.getMemories.mockReturnValue(okAsync(memories));
        m.fetchSince.mockReturnValue(okAsync(tail));
        const message = fakeMessage({ guildId: "g7", ...mention });

        await handleMessageCreate(message);

        expect(m.getState).toHaveBeenCalledWith(message.channelId);
        expect(m.getMemories).toHaveBeenCalledWith("g7");
        expect(m.fetchSince).toHaveBeenCalledWith(message.channel, "42");
        expect(m.respond).toHaveBeenCalledWith(message, { state, memories, tail });
        expect(m.compact).toHaveBeenCalledWith(message.channelId, tail, state);
    });

    it("uses the DM channel as memory scope in DMs", async () => {
        const message = fakeMessage({ guildId: null });

        await handleMessageCreate(message);

        expect(m.getMemories).toHaveBeenCalledWith(message.channelId);
    });

    it("replies without pinging anyone", async () => {
        const message = fakeMessage(mention);

        await handleMessageCreate(message);

        expect(message.reply).toHaveBeenCalledWith({
            content: "salut",
            allowedMentions: { parse: [], repliedUser: false },
        });
    });

    it("doesn't reply in a channel it can't send to", async () => {
        const channel = fakeChannel({ isSendable: () => false });
        const message = fakeMessage({ channel, ...mention });

        await handleMessageCreate(message);

        expect(message.reply).not.toHaveBeenCalled();
        expect(channel.sendTyping).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
    });
});

describe("long replies", () => {
    async function sendReply(text: string) {
        m.respond.mockReturnValue(okAsync(text));
        const message = fakeMessage(mention);
        await handleMessageCreate(message);
        const channel = message.channel as unknown as ReturnType<typeof fakeChannel>;
        const first = vi.mocked(message.reply).mock.calls[0][0] as { content: string };
        const rest = channel.send.mock.calls.map(
            (c) => c[0] as { content: string; allowedMentions: unknown },
        );
        return { first, rest };
    }

    it("splits at a newline", async () => {
        const { first, rest } = await sendReply(`${"a".repeat(1500)}\n${"b".repeat(1000)}`);

        expect(first.content).toBe("a".repeat(1500));
        expect(rest).toEqual([{ content: "b".repeat(1000), allowedMentions: { parse: [] } }]);
    });

    it("splits at a space when there's no newline late enough", async () => {
        const { first, rest } = await sendReply(`${"a".repeat(1900)} ${"b".repeat(500)}`);

        expect(first.content).toBe("a".repeat(1900));
        expect(rest.map((r) => r.content)).toEqual(["b".repeat(500)]);
    });

    it("cuts hard when there's nowhere to split", async () => {
        const { first, rest } = await sendReply("x".repeat(4500));

        expect(first.content).toHaveLength(2000);
        expect(rest.map((r) => r.content.length)).toEqual([2000, 500]);
    });

    it("keeps every chunk under Discord's limit and loses nothing", async () => {
        const words = Array.from({ length: 900 }, (_, i) => `mot${i}`).join(" ");
        const { first, rest } = await sendReply(words);
        const chunks = [first.content, ...rest.map((r) => r.content)];

        for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(2000);
        expect(chunks.join(" ")).toBe(words);
    });

    it("sends a short reply in one message", async () => {
        const { rest } = await sendReply("court");
        expect(rest).toEqual([]);
    });
});

describe("errors", () => {
    it("logs a failed turn and frees the channel", async () => {
        m.getState.mockReturnValueOnce(errAsync("Failed to load channel state: db down"));
        const channel = fakeChannel();

        await handleMessageCreate(fakeMessage({ channel, ...mention }));

        expect(logger.error).toHaveBeenCalledWith(
            `AI turn failed in channel ${channel.id}: Failed to load channel state: db down`,
        );

        // the next message in the same channel is handled
        const next = fakeMessage({ channel, ...mention });
        await handleMessageCreate(next);
        expect(next.reply).toHaveBeenCalledOnce();
    });

    it("logs a classifier failure and doesn't reply", async () => {
        m.shouldRespond.mockReturnValue(errAsync("Decision failed: rate limited"));
        const message = watched();

        await handleMessageCreate(message);

        expect(message.reply).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining("Decision failed: rate limited"),
        );
    });

    it("logs a reply that couldn't be sent", async () => {
        const message = fakeMessage(mention);
        vi.mocked(message.reply).mockRejectedValue(new Error("Missing Permissions"));

        await handleMessageCreate(message);

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining("Failed to send reply: Error: Missing Permissions"),
        );
    });

    it("logs a failed response", async () => {
        m.respond.mockReturnValue(errAsync("Response failed: overloaded"));
        const message = fakeMessage(mention);

        await handleMessageCreate(message);

        expect(message.reply).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining("Response failed: overloaded"),
        );
    });
});

describe("one turn at a time per channel", () => {
    it("merges messages sent during a turn into one more turn, for the latest message", async () => {
        const channel = fakeChannel();
        testConfig.ai.channels.push(channel.id);
        const gate = deferred<string>();
        m.respond
            .mockReturnValueOnce(ResultAsync.fromSafePromise(gate.promise))
            .mockReturnValue(okAsync("second"));
        m.shouldRespond.mockReturnValue(okAsync(true));

        const first = fakeMessage({ channel, ...mention });
        const running = handleMessageCreate(first);
        await flush();
        expect(m.respond).toHaveBeenCalledOnce();

        const second = fakeMessage({ channel, content: "two" });
        const third = fakeMessage({ channel, content: "three" });
        await handleMessageCreate(second);
        await handleMessageCreate(third);
        // still blocked on the first turn
        expect(m.respond).toHaveBeenCalledOnce();

        gate.resolve("first");
        await running;

        expect(m.respond).toHaveBeenCalledTimes(2);
        expect(m.respond.mock.calls[1][0]).toBe(third);
        expect(second.reply).not.toHaveBeenCalled();
        expect(third.reply).toHaveBeenCalledWith(expect.objectContaining({ content: "second" }));
    });

    it("keeps the merged turn direct if any message in it was", async () => {
        const channel = fakeChannel();
        testConfig.ai.channels.push(channel.id);
        const gate = deferred<string>();
        m.respond
            .mockReturnValueOnce(ResultAsync.fromSafePromise(gate.promise))
            .mockReturnValue(okAsync("ok"));

        const running = handleMessageCreate(fakeMessage({ channel, ...mention }));
        await flush();

        // a mention, then a normal message: the turn must still skip the classifier
        await handleMessageCreate(fakeMessage({ channel, ...mention }));
        await handleMessageCreate(fakeMessage({ channel }));

        gate.resolve("first");
        await running;

        expect(m.shouldRespond).not.toHaveBeenCalled();
        expect(m.respond).toHaveBeenCalledTimes(2);
    });

    it("asks the classifier for a merged turn with no direct message", async () => {
        const channel = fakeChannel();
        testConfig.ai.channels.push(channel.id);
        const gate = deferred<string>();
        m.respond.mockReturnValueOnce(ResultAsync.fromSafePromise(gate.promise));

        const running = handleMessageCreate(fakeMessage({ channel, ...mention }));
        await flush();
        await handleMessageCreate(fakeMessage({ channel }));

        gate.resolve("first");
        await running;

        expect(m.shouldRespond).toHaveBeenCalledOnce();
    });

    it("doesn't block other channels", async () => {
        const gate = deferred<string>();
        m.respond
            .mockReturnValueOnce(ResultAsync.fromSafePromise(gate.promise))
            .mockReturnValue(okAsync("other"));

        const running = handleMessageCreate(fakeMessage(mention));
        await flush();

        const elsewhere = fakeMessage(mention);
        await handleMessageCreate(elsewhere);
        expect(elsewhere.reply).toHaveBeenCalledOnce();

        gate.resolve("first");
        await running;
    });
});

describe("typing indicator", () => {
    it("keeps typing during a long turn and stops after the reply", async () => {
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
        const gate = deferred<string>();
        m.respond.mockReturnValueOnce(ResultAsync.fromSafePromise(gate.promise));
        const channel = fakeChannel();

        const running = handleMessageCreate(fakeMessage({ channel, ...mention }));
        await flush();
        expect(channel.sendTyping).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(16_000);
        expect(channel.sendTyping).toHaveBeenCalledTimes(3);

        gate.resolve("done");
        await running;

        vi.advanceTimersByTime(30_000);
        expect(channel.sendTyping).toHaveBeenCalledTimes(3);
    });

    it("stops typing when the response fails", async () => {
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
        m.respond.mockReturnValue(errAsync("Response failed: x"));
        const channel = fakeChannel();

        await handleMessageCreate(fakeMessage({ channel, ...mention }));
        const calls = channel.sendTyping.mock.calls.length;

        vi.advanceTimersByTime(30_000);
        expect(channel.sendTyping).toHaveBeenCalledTimes(calls);
    });
});
