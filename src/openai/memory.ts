import type { Message } from "discord.js";
import { okAsync, type ResultAsync } from "neverthrow";
import { prisma } from "../prisma.js";
import { openai } from "./client.js";
import { safeCall } from "./index.js";
import { toTranscript } from "./context.js";
import {
    AI_CONTEXT_COMPACT_AT,
    AI_CONTEXT_KEEP,
    AI_MEMORY_LIMIT,
    OPENAI_SUMMARY_MODEL,
} from "../consts.js";

export interface ChannelState {
    summary: string;
    cursorId: string | null;
}

export interface Memory {
    id: number;
    content: string;
}

const SUMMARY_INSTRUCTIONS =
    "You maintain the running summary of a Discord channel for Pijon Bot. Merge the new messages into the current summary. "
    + "Keep who said what that matters, decisions, open questions, ongoing topics, running jokes and anything Pijon promised. Drop small talk. "
    + "Write in the channel's language, under 1500 characters. Answer with the new summary only.";

export function getState(channelId: string): ResultAsync<ChannelState, string> {
    return prisma
        .safe(prisma.ai_channel_state.findUnique({ where: { channel_id: channelId } }))
        .map((row) => ({ summary: row?.summary ?? "", cursorId: row?.cursor_id ?? null }))
        .mapErr((error) => `Failed to load channel state: ${error.message}`);
}

/** Folds the oldest messages into the summary once the raw tail is too long */
export function compact(
    channelId: string,
    tail: Message[],
    state: ChannelState,
): ResultAsync<void, string> {
    if (tail.length <= AI_CONTEXT_COMPACT_AT) return okAsync(undefined);

    const folded = tail.slice(0, tail.length - AI_CONTEXT_KEEP);
    const cursorId = folded[folded.length - 1].id;

    return safeCall(
        openai.responses.create({
            model: OPENAI_SUMMARY_MODEL,
            instructions: SUMMARY_INSTRUCTIONS,
            input: `Current summary:\n${state.summary || "(empty)"}\n\nNew messages:\n${toTranscript(folded)}`,
            reasoning: { effort: "low" },
            store: false,
        }),
        "Summary",
    )
        .andThen((response) =>
            prisma
                .safe(
                    prisma.ai_channel_state.upsert({
                        where: { channel_id: channelId },
                        create: {
                            channel_id: channelId,
                            summary: response.output_text,
                            cursor_id: cursorId,
                        },
                        update: { summary: response.output_text, cursor_id: cursorId },
                    }),
                )
                .mapErr((error) => `Failed to save summary: ${error.message}`),
        )
        .map(() => undefined);
}

export function getMemories(scopeId: string): ResultAsync<Memory[], string> {
    return prisma
        .safe(
            prisma.ai_memory.findMany({
                where: { scope_id: scopeId },
                orderBy: { created_at: "desc" },
                take: AI_MEMORY_LIMIT,
            }),
        )
        .map((rows) => rows.map(({ id, content }) => ({ id, content })))
        .mapErr((error) => `Failed to load memories: ${error.message}`);
}

export function addMemory(
    scopeId: string,
    userId: string | null,
    content: string,
): ResultAsync<number, string> {
    return prisma
        .safe(
            prisma.ai_memory.create({
                data: { scope_id: scopeId, user_id: userId, content: content.slice(0, 500) },
            }),
        )
        .map((row) => row.id)
        .mapErr((error) => `Failed to save memory: ${error.message}`);
}

export function deleteMemory(scopeId: string, id: number): ResultAsync<boolean, string> {
    return prisma
        .safe(prisma.ai_memory.deleteMany({ where: { id, scope_id: scopeId } }))
        .map(({ count }) => count > 0)
        .mapErr((error) => `Failed to delete memory: ${error.message}`);
}
