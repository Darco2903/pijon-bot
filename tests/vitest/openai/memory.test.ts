import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    addMemory,
    compact,
    deleteMemory,
    getMemories,
    getState,
} from "../../../src/openai/memory.js";
import {
    AI_CONTEXT_COMPACT_AT,
    AI_CONTEXT_KEEP,
    AI_MEMORY_LIMIT,
    OPENAI_SUMMARY_MODEL,
} from "../../../src/consts.js";
import { fakeChannel, fakeMessage, fakeUser } from "../fakes/discord.js";

const { openai, db } = vi.hoisted(() => ({
    openai: { responses: { create: vi.fn() }, decisions: { create: vi.fn() } },
    db: {
        ai_channel_state: { findUnique: vi.fn(), upsert: vi.fn() },
        ai_memory: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    },
}));

vi.mock("../../../src/openai/client.js", () => ({ openai }));

vi.mock("../../../src/prisma.js", async () => {
    const { ResultAsync } = await import("neverthrow");
    return {
        prisma: {
            ...db,
            safe: <T>(promise: Promise<T>) => ResultAsync.fromPromise(promise, (e) => e as Error),
        },
    };
});

function tail(count: number) {
    const channel = fakeChannel();
    return Array.from({ length: count }, (_, i) =>
        fakeMessage({ channel, author: fakeUser({ displayName: "Bob" }), content: `m${i}` }),
    );
}

beforeEach(() => {
    openai.responses.create.mockReset();
    for (const fn of [
        db.ai_channel_state.findUnique,
        db.ai_channel_state.upsert,
        db.ai_memory.findMany,
        db.ai_memory.create,
        db.ai_memory.deleteMany,
    ]) {
        fn.mockReset();
    }
});

describe("getState", () => {
    it("defaults to an empty summary and no cursor when there's no row", async () => {
        db.ai_channel_state.findUnique.mockResolvedValue(null);

        const res = await getState("chan");

        expect(res._unsafeUnwrap()).toEqual({ summary: "", cursorId: null });
        expect(db.ai_channel_state.findUnique).toHaveBeenCalledWith({
            where: { channel_id: "chan" },
        });
    });

    it("returns the stored summary and cursor", async () => {
        db.ai_channel_state.findUnique.mockResolvedValue({
            channel_id: "chan",
            summary: "they talked about pizza",
            cursor_id: "123",
        });

        const res = await getState("chan");

        expect(res._unsafeUnwrap()).toEqual({
            summary: "they talked about pizza",
            cursorId: "123",
        });
    });

    it("returns an error when the query fails", async () => {
        db.ai_channel_state.findUnique.mockRejectedValue(new Error("db down"));

        const res = await getState("chan");

        expect(res._unsafeUnwrapErr()).toBe("Failed to load channel state: db down");
    });
});

describe("compact", () => {
    it("does nothing at or below the threshold", async () => {
        const res = await compact("chan", tail(AI_CONTEXT_COMPACT_AT), {
            summary: "",
            cursorId: null,
        });

        expect(res.isOk()).toBe(true);
        expect(openai.responses.create).not.toHaveBeenCalled();
        expect(db.ai_channel_state.upsert).not.toHaveBeenCalled();
    });

    it("folds all but the last KEEP messages into the summary and moves the cursor", async () => {
        const messages = tail(AI_CONTEXT_COMPACT_AT + 1);
        const foldedCount = messages.length - AI_CONTEXT_KEEP;
        openai.responses.create.mockResolvedValue({ output_text: "new summary" });
        db.ai_channel_state.upsert.mockResolvedValue({});

        const res = await compact("chan", messages, { summary: "", cursorId: null });

        expect(res.isOk()).toBe(true);

        const body = openai.responses.create.mock.calls[0][0];
        expect(body.model).toBe(OPENAI_SUMMARY_MODEL);
        expect(body.store).toBe(false);
        expect(body.input).toContain("Current summary:\n(empty)");
        expect(body.input).toContain(`[Bob] m${foldedCount - 1}`);
        // the kept messages stay raw, they aren't summarized
        expect(body.input).not.toContain(`[Bob] m${foldedCount}\n`);
        expect(body.input).not.toContain(`[Bob] m${messages.length - 1}`);

        const cursorId = messages[foldedCount - 1].id;
        expect(db.ai_channel_state.upsert).toHaveBeenCalledWith({
            where: { channel_id: "chan" },
            create: { channel_id: "chan", summary: "new summary", cursor_id: cursorId },
            update: { summary: "new summary", cursor_id: cursorId },
        });
    });

    it("merges into the existing summary", async () => {
        openai.responses.create.mockResolvedValue({ output_text: "merged" });
        db.ai_channel_state.upsert.mockResolvedValue({});

        await compact("chan", tail(AI_CONTEXT_COMPACT_AT + 5), {
            summary: "old summary",
            cursorId: "1",
        });

        expect(openai.responses.create.mock.calls[0][0].input).toContain(
            "Current summary:\nold summary",
        );
    });

    it("writes nothing when the summary call fails", async () => {
        openai.responses.create.mockRejectedValue(new Error("timeout"));

        const res = await compact("chan", tail(AI_CONTEXT_COMPACT_AT + 1), {
            summary: "",
            cursorId: null,
        });

        expect(res._unsafeUnwrapErr()).toBe("Summary failed: timeout");
        expect(db.ai_channel_state.upsert).not.toHaveBeenCalled();
    });

    it("returns an error when saving fails", async () => {
        openai.responses.create.mockResolvedValue({ output_text: "s" });
        db.ai_channel_state.upsert.mockRejectedValue(new Error("db down"));

        const res = await compact("chan", tail(AI_CONTEXT_COMPACT_AT + 1), {
            summary: "",
            cursorId: null,
        });

        expect(res._unsafeUnwrapErr()).toBe("Failed to save summary: db down");
    });
});

describe("getMemories", () => {
    it("loads the latest memories of the scope", async () => {
        db.ai_memory.findMany.mockResolvedValue([
            { id: 2, scope_id: "g", user_id: null, content: "b", created_at: new Date() },
            { id: 1, scope_id: "g", user_id: "u", content: "a", created_at: new Date() },
        ]);

        const res = await getMemories("g");

        expect(res._unsafeUnwrap()).toEqual([
            { id: 2, content: "b" },
            { id: 1, content: "a" },
        ]);
        expect(db.ai_memory.findMany).toHaveBeenCalledWith({
            where: { scope_id: "g" },
            orderBy: { created_at: "desc" },
            take: AI_MEMORY_LIMIT,
        });
    });

    it("returns an error when the query fails", async () => {
        db.ai_memory.findMany.mockRejectedValue(new Error("db down"));

        const res = await getMemories("g");

        expect(res._unsafeUnwrapErr()).toBe("Failed to load memories: db down");
    });
});

describe("addMemory", () => {
    it("saves the memory and returns its id", async () => {
        db.ai_memory.create.mockResolvedValue({ id: 7 });

        const res = await addMemory("g", "u", "Alice aime le jazz");

        expect(res._unsafeUnwrap()).toBe(7);
        expect(db.ai_memory.create).toHaveBeenCalledWith({
            data: { scope_id: "g", user_id: "u", content: "Alice aime le jazz" },
        });
    });

    it("accepts a memory that isn't about a user", async () => {
        db.ai_memory.create.mockResolvedValue({ id: 8 });

        await addMemory("g", null, "le serveur a 3 ans");

        expect(db.ai_memory.create.mock.calls[0][0].data.user_id).toBeNull();
    });

    it("cuts the content to 500 characters", async () => {
        db.ai_memory.create.mockResolvedValue({ id: 9 });

        await addMemory("g", null, "x".repeat(600));

        expect(db.ai_memory.create.mock.calls[0][0].data.content).toHaveLength(500);
    });

    it("returns an error when saving fails", async () => {
        db.ai_memory.create.mockRejectedValue(new Error("db down"));

        const res = await addMemory("g", null, "x");

        expect(res._unsafeUnwrapErr()).toBe("Failed to save memory: db down");
    });
});

describe("deleteMemory", () => {
    it("deletes only within the scope and reports it was found", async () => {
        db.ai_memory.deleteMany.mockResolvedValue({ count: 1 });

        const res = await deleteMemory("g", 3);

        expect(res._unsafeUnwrap()).toBe(true);
        expect(db.ai_memory.deleteMany).toHaveBeenCalledWith({ where: { id: 3, scope_id: "g" } });
    });

    it("reports a missing memory", async () => {
        db.ai_memory.deleteMany.mockResolvedValue({ count: 0 });

        const res = await deleteMemory("g", 3);

        expect(res._unsafeUnwrap()).toBe(false);
    });

    it("returns an error when the query fails", async () => {
        db.ai_memory.deleteMany.mockRejectedValue(new Error("db down"));

        const res = await deleteMemory("g", 3);

        expect(res._unsafeUnwrapErr()).toBe("Failed to delete memory: db down");
    });
});
