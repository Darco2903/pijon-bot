import z from "zod";
import { authorName, fetchBefore, formatMessage } from "../context.js";
import { addMemory, deleteMemory } from "../memory.js";
import { AI_HISTORY_SCAN_LIMIT } from "../../consts.js";
import { defineTool } from "./tool.js";

const searchHistory = defineTool({
    name: "search_history",
    description:
        "Search older messages of this channel that are no longer in your context. Filter by keyword and/or author name.",
    parameters: z.object({ query: z.string().nullable(), author: z.string().nullable() }),
    run({ query, author }, { message, contextStartId }) {
        const q = query?.toLowerCase();
        const a = author?.toLowerCase();

        return fetchBefore(message.channel, contextStartId, AI_HISTORY_SCAN_LIMIT)
            .map((messages) =>
                messages
                    .filter((m) => !q || m.cleanContent.toLowerCase().includes(q))
                    .filter((m) => !a || authorName(m).toLowerCase().includes(a))
                    .slice(-20),
            )
            .map((found) =>
                found.length === 0 ?
                    "No matching messages."
                :   found
                        .map((m) => `${m.createdAt.toISOString().slice(0, 16)} ${formatMessage(m)}`)
                        .join("\n"),
            );
    },
});

const remember = defineTool({
    name: "remember",
    description:
        "Save a durable fact for later conversations in this server (preference, fact about someone). Write it self-contained, with names.",
    parameters: z.object({ content: z.string(), about_author: z.boolean() }),
    run({ content, about_author }, { message }) {
        const scopeId = message.guildId ?? message.channelId;
        return addMemory(scopeId, about_author ? message.author.id : null, content).map(
            (id) => `Saved as #${id}.`,
        );
    },
});

const forget = defineTool({
    name: "forget",
    description: "Delete a saved fact by its #id.",
    parameters: z.object({ id: z.number().int() }),
    run({ id }, { message }) {
        return deleteMemory(message.guildId ?? message.channelId, id).map((deleted) =>
            deleted ? `Deleted #${id}.` : `No memory #${id}.`,
        );
    },
});

export const memoryTools = [searchHistory, remember, forget];
