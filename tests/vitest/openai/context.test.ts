import { describe, expect, it } from "vitest";
import { Collection } from "discord.js";
import {
    authorName,
    fetchBefore,
    fetchSince,
    formatMessage,
    isOwn,
    toInput,
    toTranscript,
} from "../../../src/openai/context.js";
import { AI_MESSAGE_MAX_CHARS } from "../../../src/consts.js";
import { botUser, fakeChannel, fakeMessage, fakeUser, fetchedPage } from "../fakes/discord.js";

describe("isOwn", () => {
    it("is true for the bot's own messages only", () => {
        expect(isOwn(fakeMessage({ author: botUser() }))).toBe(true);
        expect(isOwn(fakeMessage({ author: fakeUser() }))).toBe(false);
    });
});

describe("authorName", () => {
    it("prefers the server nickname", () => {
        const message = fakeMessage({
            author: fakeUser({ displayName: "alice" }),
            memberName: "Ali",
        });
        expect(authorName(message)).toBe("Ali");
    });

    it("falls back to the user's display name without a member", () => {
        const message = fakeMessage({
            author: fakeUser({ displayName: "alice" }),
            memberName: null,
        });
        expect(authorName(message)).toBe("alice");
    });
});

describe("formatMessage", () => {
    it("uses cleanContent, so mentions show as names", () => {
        const message = fakeMessage({
            author: fakeUser({ displayName: "Bob" }),
            content: "hi <@123>",
            cleanContent: "hi @Alice",
        });
        expect(formatMessage(message)).toBe("[Bob] hi @Alice");
    });

    it("cuts long messages and marks the cut", () => {
        const message = fakeMessage({
            author: fakeUser({ displayName: "Bob" }),
            content: "a".repeat(AI_MESSAGE_MAX_CHARS + 50),
        });
        expect(formatMessage(message)).toBe(`[Bob] ${"a".repeat(AI_MESSAGE_MAX_CHARS)}…`);
    });

    it("keeps a message of exactly the max length whole", () => {
        const text = "a".repeat(AI_MESSAGE_MAX_CHARS);
        const message = fakeMessage({ author: fakeUser({ displayName: "Bob" }), content: text });
        expect(formatMessage(message)).toBe(`[Bob] ${text}`);
    });

    it("lists attachments after the text", () => {
        const message = fakeMessage({
            author: fakeUser({ displayName: "Bob" }),
            content: "look",
            attachments: ["cat.png", "dog.jpg"],
        });
        expect(formatMessage(message)).toBe(
            "[Bob] look [pièce jointe: cat.png] [pièce jointe: dog.jpg]",
        );
    });

    it("has no leading space for an attachment-only message", () => {
        const message = fakeMessage({
            author: fakeUser({ displayName: "Bob" }),
            content: "",
            attachments: ["cat.png"],
        });
        expect(formatMessage(message)).toBe("[Bob] [pièce jointe: cat.png]");
    });

    it("shows who the message replies to", () => {
        const message = fakeMessage({
            author: fakeUser({ displayName: "Bob" }),
            content: "yes",
            repliedUser: fakeUser({ displayName: "Alice" }),
        });
        expect(formatMessage(message)).toBe("[Bob → @Alice] yes");
    });

    it("uses the server nickname as author", () => {
        const message = fakeMessage({
            author: fakeUser({ displayName: "bob" }),
            memberName: "Bobby",
            content: "yo",
        });
        expect(formatMessage(message)).toBe("[Bobby] yo");
    });
});

describe("toInput", () => {
    it("turns the bot's messages into assistant turns and others into user turns", () => {
        const user = fakeMessage({
            author: fakeUser({ displayName: "Bob" }),
            content: "hey pijon",
        });
        const own = fakeMessage({ author: botUser(), content: "salut" });

        expect(toInput([user, own])).toEqual([
            { role: "user", content: "[Bob] hey pijon" },
            { role: "assistant", content: "salut" },
        ]);
    });

    it("keeps the bot's raw content, without the author prefix", () => {
        const own = fakeMessage({ author: botUser(), content: "**gras**", cleanContent: "gras" });
        expect(toInput([own])).toEqual([{ role: "assistant", content: "**gras**" }]);
    });
});

describe("toTranscript", () => {
    it("labels the bot's messages and joins lines", () => {
        const user = fakeMessage({ author: fakeUser({ displayName: "Bob" }), content: "hey" });
        const own = fakeMessage({ author: botUser(), content: "salut" });

        expect(toTranscript([user, own])).toBe("[Bob] hey\n[Pijon Bot (toi)] salut");
    });

    it("is empty for no messages", () => {
        expect(toTranscript([])).toBe("");
    });
});

describe("fetchSince", () => {
    it("returns the messages oldest first, from the newest page of 100", async () => {
        const channel = fakeChannel();
        const messages = [1, 2, 3].map((n) => fakeMessage({ channel, content: `m${n}` }));
        channel.messages.fetch.mockResolvedValue(fetchedPage(messages));

        const res = await fetchSince(channel as never, null);

        expect(channel.messages.fetch).toHaveBeenCalledWith({ limit: 100 });
        expect(res._unsafeUnwrap().map((m) => m.content)).toEqual(["m1", "m2", "m3"]);
    });

    it("keeps only messages after the cursor", async () => {
        const channel = fakeChannel();
        const messages = [1, 2, 3, 4].map((n) => fakeMessage({ channel, content: `m${n}` }));
        channel.messages.fetch.mockResolvedValue(fetchedPage(messages));

        const res = await fetchSince(channel as never, messages[1].id);

        expect(res._unsafeUnwrap().map((m) => m.content)).toEqual(["m3", "m4"]);
    });

    it("compares ids as numbers, not strings", async () => {
        const channel = fakeChannel();
        // "1000" < "999" as strings, but 1000 > 999 as snowflakes
        const newer = fakeMessage({ channel, id: "1000", content: "newer" });
        const older = fakeMessage({ channel, id: "998", content: "older" });
        channel.messages.fetch.mockResolvedValue(fetchedPage([older, newer]));

        const res = await fetchSince(channel as never, "999");

        expect(res._unsafeUnwrap().map((m) => m.content)).toEqual(["newer"]);
    });

    it("drops other bots but keeps the bot's own messages", async () => {
        const channel = fakeChannel();
        const user = fakeMessage({ channel, content: "user" });
        const other = fakeMessage({
            channel,
            content: "other bot",
            author: fakeUser({ bot: true }),
        });
        const own = fakeMessage({ channel, content: "own", author: botUser() });
        channel.messages.fetch.mockResolvedValue(fetchedPage([user, other, own]));

        const res = await fetchSince(channel as never, null);

        expect(res._unsafeUnwrap().map((m) => m.content)).toEqual(["user", "own"]);
    });

    it("drops empty messages but keeps attachment-only ones", async () => {
        const channel = fakeChannel();
        const empty = fakeMessage({ channel, content: "" });
        const file = fakeMessage({ channel, content: "", attachments: ["a.png"] });
        channel.messages.fetch.mockResolvedValue(fetchedPage([empty, file]));

        const res = await fetchSince(channel as never, null);

        expect(res._unsafeUnwrap()).toEqual([file]);
    });

    it("returns an error when the fetch fails", async () => {
        const channel = fakeChannel();
        channel.messages.fetch.mockRejectedValue(new Error("Missing Access"));

        const res = await fetchSince(channel as never, null);

        expect(res._unsafeUnwrapErr()).toBe("Failed to fetch messages: Error: Missing Access");
    });
});

describe("fetchBefore", () => {
    it("pages back until there are no more messages, oldest first", async () => {
        const channel = fakeChannel();
        const all = [1, 2, 3, 4].map((n) => fakeMessage({ channel, content: `m${n}` }));
        const start = fakeMessage({ channel, content: "start" });
        channel.messages.fetch
            .mockResolvedValueOnce(fetchedPage(all.slice(2)))
            .mockResolvedValueOnce(fetchedPage(all.slice(0, 2)))
            .mockResolvedValueOnce(new Collection());

        const res = await fetchBefore(channel as never, start.id, 500);

        expect(res._unsafeUnwrap().map((m) => m.content)).toEqual(["m1", "m2", "m3", "m4"]);
        expect(channel.messages.fetch).toHaveBeenNthCalledWith(1, { before: start.id, limit: 100 });
        // the next page starts before the oldest message of the previous one
        expect(channel.messages.fetch).toHaveBeenNthCalledWith(2, {
            before: all[2].id,
            limit: 100,
        });
        expect(channel.messages.fetch).toHaveBeenNthCalledWith(3, {
            before: all[0].id,
            limit: 100,
        });
    });

    it("stops once it has max messages", async () => {
        const channel = fakeChannel();
        const fetch = channel.messages.fetch.mockImplementation(async () =>
            fetchedPage([fakeMessage({ channel }), fakeMessage({ channel })]),
        );

        const res = await fetchBefore(channel as never, "1", 4);

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(res._unsafeUnwrap()).toHaveLength(4);
    });

    it("drops other bots and empty messages", async () => {
        const channel = fakeChannel();
        const keep = fakeMessage({ channel, content: "keep" });
        const bot = fakeMessage({ channel, author: fakeUser({ bot: true }) });
        const empty = fakeMessage({ channel, content: "" });
        channel.messages.fetch
            .mockResolvedValueOnce(fetchedPage([keep, bot, empty]))
            .mockResolvedValue(new Collection());

        const res = await fetchBefore(channel as never, "1", 500);

        expect(res._unsafeUnwrap()).toEqual([keep]);
    });

    it("returns an error when a fetch fails", async () => {
        const channel = fakeChannel();
        channel.messages.fetch.mockRejectedValue(new Error("boom"));

        const res = await fetchBefore(channel as never, "1", 500);

        expect(res._unsafeUnwrapErr()).toBe("Failed to fetch history: Error: boom");
    });
});
