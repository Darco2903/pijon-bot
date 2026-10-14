import type { Message } from "discord.js";
import type { ResponseInputItem } from "openai/resources/responses/responses";
import { ResultAsync } from "neverthrow";
import { AI_MESSAGE_MAX_CHARS } from "../consts.js";

export type ChatChannel = Message["channel"];

export function isOwn(message: Message): boolean {
    return message.author.id === message.client.user.id;
}

/** Other bots are noise, empty messages are system ones */
function isRelevant(message: Message): boolean {
    return (
        (!message.author.bot || isOwn(message))
        && (message.content !== "" || message.attachments.size > 0)
    );
}

export function authorName(message: Message): string {
    return message.member?.displayName ?? message.author.displayName;
}

export function formatMessage(message: Message): string {
    // <@123> → @name
    let text = message.cleanContent;
    if (text.length > AI_MESSAGE_MAX_CHARS) {
        text = `${text.slice(0, AI_MESSAGE_MAX_CHARS)}…`;
    }

    const parts = [
        //
        text,
        ...message.attachments.map((a) => `[pièce jointe: ${a.name}]`),
    ].filter(Boolean);

    const repliedUser = message.mentions.repliedUser;
    const replyTo = repliedUser ? ` → @${repliedUser.displayName}` : "";
    return `[${authorName(message)}${replyTo}] ${parts.join(" ")}`;
}

/** Response model input: the bot's own messages are its turns */
export function toInput(messages: Message[]): ResponseInputItem[] {
    return messages.map((m) =>
        isOwn(m) ?
            { role: "assistant", content: m.content }
        :   { role: "user", content: formatMessage(m) },
    );
}

/** Plain transcript, for the classifier and the summarizer */
export function toTranscript(messages: Message[]): string {
    return messages
        .map((m) => (isOwn(m) ? `[Pijon Bot (toi)] ${m.content}` : formatMessage(m)))
        .join("\n");
}

/**
 * Messages after the cursor, oldest first, at most the last 100.
 * Fetches the newest page rather than `after` so a long downtime can't hide the latest messages.
 */
export function fetchSince(
    channel: ChatChannel,
    cursorId: string | null,
): ResultAsync<Message[], string> {
    return ResultAsync.fromPromise(
        channel.messages.fetch({ limit: 100 }),
        (error) => `Failed to fetch messages: ${error}`,
    ).map((page) =>
        [...page.values()]
            .filter((m) => cursorId === null || BigInt(m.id) > BigInt(cursorId))
            .filter(isRelevant)
            .reverse(),
    );
}

/** Up to `max` messages before `beforeId`, oldest first */
export function fetchBefore(
    channel: ChatChannel,
    beforeId: string,
    max: number,
): ResultAsync<Message[], string> {
    return ResultAsync.fromPromise(
        (async () => {
            const out: Message[] = [];
            let before = beforeId;
            while (out.length < max) {
                const page = await channel.messages.fetch({ before, limit: 100 });
                if (page.size === 0) break;
                out.push(...page.values());
                // pages are newest first
                before = page.lastKey()!;
            }
            return out.filter(isRelevant).reverse();
        })(),
        (error) => `Failed to fetch history: ${error}`,
    );
}
