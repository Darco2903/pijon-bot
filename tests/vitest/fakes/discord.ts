import { vi } from "vitest";
import { Collection, type Message } from "discord.js";

export const BOT_ID = "900000000000000000";

let nextId = 1_000_000_000_000_000_000n;
/** Increasing snowflakes, so ids compare like Discord's */
export function snowflake(): string {
    nextId += 1n;
    return nextId.toString();
}

export interface FakeUser {
    id: string;
    bot: boolean;
    displayName: string;
}

export function fakeUser(overrides: Partial<FakeUser> = {}): FakeUser {
    return { id: snowflake(), bot: false, displayName: "Alice", ...overrides };
}

export const botUser = (): FakeUser => ({ id: BOT_ID, bot: true, displayName: "Pijon Bot" });

export interface FakeChannel {
    id: string;
    isSendable: () => boolean;
    send: ReturnType<typeof vi.fn>;
    sendTyping: ReturnType<typeof vi.fn>;
    messages: { fetch: ReturnType<typeof vi.fn> };
}

export function fakeChannel(overrides: Partial<FakeChannel> = {}): FakeChannel {
    return {
        id: snowflake(),
        isSendable: () => true,
        send: vi.fn().mockResolvedValue(undefined),
        sendTyping: vi.fn().mockResolvedValue(undefined),
        messages: { fetch: vi.fn().mockResolvedValue(new Collection()) },
        ...overrides,
    };
}

export interface FakeMessageOptions {
    id?: string;
    content?: string;
    /** Defaults to content */
    cleanContent?: string;
    author?: FakeUser;
    /** Server nickname, null for DMs or members missing from the cache */
    memberName?: string | null;
    attachments?: string[];
    mentionedUserIds?: string[];
    repliedUser?: FakeUser | null;
    channel?: FakeChannel;
    /** null for DMs */
    guildId?: string | null;
    guild?: unknown;
    member?: unknown;
    createdAt?: Date;
}

/** Only the fields the bot reads, cast to Message */
export function fakeMessage(options: FakeMessageOptions = {}): Message {
    const content = options.content ?? "hello";
    const author = options.author ?? fakeUser();
    const channel = options.channel ?? fakeChannel();
    const guildId = options.guildId === undefined ? "guild-1" : options.guildId;
    const createdAt = options.createdAt ?? new Date("2026-10-14T12:00:00Z");
    const memberName = options.memberName === undefined ? null : options.memberName;

    const attachments = new Collection<string, { name: string }>();
    for (const [i, name] of (options.attachments ?? []).entries()) {
        attachments.set(String(i), { name });
    }

    const users = new Collection<string, unknown>();
    for (const id of options.mentionedUserIds ?? []) users.set(id, { id });

    const member =
        options.member !== undefined ? options.member
        : memberName !== null ? { displayName: memberName }
        : null;

    return {
        id: options.id ?? snowflake(),
        content,
        cleanContent: options.cleanContent ?? content,
        author,
        member,
        attachments,
        mentions: { users, repliedUser: options.repliedUser ?? null },
        client: { user: { id: BOT_ID } },
        channel,
        channelId: channel.id,
        guildId,
        guild: options.guild ?? (guildId ? { id: guildId } : null),
        inGuild: () => guildId !== null,
        reply: vi.fn().mockResolvedValue(undefined),
        createdAt,
        createdTimestamp: createdAt.getTime(),
    } as unknown as Message;
}

/** Newest first, like channel.messages.fetch() */
export function fetchedPage(messages: Message[]): Collection<string, Message> {
    const page = new Collection<string, Message>();
    for (const m of [...messages].reverse()) page.set(m.id, m);
    return page;
}

export interface FakeInteractionOptions {
    commandName?: string;
    guild?: unknown;
    user?: { id: string; tag: string };
    strings?: Record<string, string>;
    numbers?: Record<string, number>;
    channels?: Record<string, unknown>;
    deferred?: boolean;
    replied?: boolean;
    resolveChannel?: (id: string) => unknown;
}

/** A chat input or autocomplete interaction with spied reply methods */
export function fakeInteraction(options: FakeInteractionOptions = {}) {
    const interaction = {
        commandName: options.commandName ?? "test",
        guild: options.guild === undefined ? null : options.guild,
        user: options.user ?? { id: "user-1", tag: "alice#0001" },
        deferred: options.deferred ?? false,
        replied: options.replied ?? false,
        options: {
            getString: vi.fn((name: string) => options.strings?.[name] ?? null),
            getNumber: vi.fn((name: string) => options.numbers?.[name] ?? null),
            getChannel: vi.fn((name: string) => options.channels?.[name] ?? null),
        },
        client: { channels: { resolve: vi.fn(options.resolveChannel ?? (() => null)) } },
        reply: vi.fn(async () => {
            interaction.replied = true;
        }),
        deferReply: vi.fn(async () => {
            interaction.deferred = true;
        }),
        editReply: vi.fn().mockResolvedValue(undefined),
        followUp: vi.fn().mockResolvedValue(undefined),
        respond: vi.fn().mockResolvedValue(undefined),
        isChatInputCommand: () => true,
        isAutocomplete: () => false,
    };
    return interaction;
}
