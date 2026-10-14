import type { Message } from "discord.js";
import { okAsync, ResultAsync } from "neverthrow";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { AI_DECISION_WINDOW } from "../consts.js";
import { fetchSince } from "./context.js";
import { shouldRespond } from "./decide.js";
import { compact, getMemories, getState } from "./memory.js";
import { respond, type TurnContext } from "./respond.js";

interface PendingTurn {
    message: Message;
    direct: boolean;
}

/** Channels with a turn in progress */
const busy = new Set<string>();
/** Latest message that came in during a turn, handled once the turn is done */
const pending = new Map<string, PendingTurn>();

/** DMs, mentions and replies to the bot skip the classifier */
function isDirect(message: Message): boolean {
    const me = message.client.user.id;
    return (
        !message.inGuild()
        || message.mentions.users.has(me)
        || message.mentions.repliedUser?.id === me
    );
}

function splitMessage(text: string, max = 2000): string[] {
    const chunks: string[] = [];
    let rest = text;
    while (rest.length > max) {
        let cut = rest.lastIndexOf("\n", max);
        if (cut < max / 2) cut = rest.lastIndexOf(" ", max);
        if (cut <= 0) cut = max;
        chunks.push(rest.slice(0, cut));
        rest = rest.slice(cut).trimStart();
    }
    if (rest) chunks.push(rest);
    return chunks;
}

function send(message: Message, text: string): ResultAsync<void, string> {
    if (!message.channel.isSendable()) return okAsync(undefined);
    const channel = message.channel;
    const [first, ...rest] = splitMessage(text);

    return ResultAsync.fromPromise(
        (async () => {
            // the model must never ping @everyone or roles
            await message.reply({
                content: first,
                allowedMentions: { parse: [], repliedUser: false },
            });
            for (const chunk of rest) {
                await channel.send({ content: chunk, allowedMentions: { parse: [] } });
            }
        })(),
        (error) => `Failed to send reply: ${error}`,
    );
}

/** Typing lasts 10s, tool loops can take longer */
function keepTyping(message: Message): () => void {
    if (!message.channel.isSendable()) return () => {};
    const channel = message.channel;
    const type = () => void channel.sendTyping().catch(() => {});
    type();
    const interval = setInterval(type, 8_000);
    return () => clearInterval(interval);
}

function reply(message: Message, turn: TurnContext): ResultAsync<void, string> {
    const stopTyping = keepTyping(message);
    return respond(message, turn)
        .andThen((text) => send(message, text))
        .andTee(stopTyping)
        .orTee(stopTyping);
}

function handleTurn({ message, direct }: PendingTurn): ResultAsync<void, string> {
    const channelId = message.channelId;

    return ResultAsync.combine([getState(channelId), getMemories(message.guildId ?? channelId)])
        .andThen(([state, memories]) =>
            fetchSince(message.channel, state.cursorId).map((tail): TurnContext => ({
                state,
                memories,
                tail,
            })),
        )
        .andThen((turn) =>
            (direct ? okAsync(true) : shouldRespond(turn.tail.slice(-AI_DECISION_WINDOW)))
                .andTee((yes) => {
                    logger.debug(
                        `AI decision in ${channelId}: ${yes ? "respond" : "ignore"}${direct ? " (direct)" : ""}`,
                    );
                })
                .andThen((yes) => (yes ? reply(message, turn) : okAsync(undefined)))
                .andThen(() => compact(channelId, turn.tail, turn.state)),
        );
}

export async function handleMessageCreate(message: Message): Promise<void> {
    if (message.author.bot) return;

    const direct = isDirect(message);
    if (!direct && !config.ai.channels.includes(message.channelId)) return;

    const channelId = message.channelId;
    if (busy.has(channelId)) {
        pending.set(channelId, {
            message,
            direct: direct || (pending.get(channelId)?.direct ?? false),
        });
        return;
    }

    busy.add(channelId);
    try {
        let next: PendingTurn | undefined = { message, direct };
        while (next) {
            pending.delete(channelId);
            await handleTurn(next).orTee((error) => {
                logger.error(`AI turn failed in channel ${channelId}: ${error}`);
            });
            next = pending.get(channelId);
        }
    } finally {
        busy.delete(channelId);
    }
}
