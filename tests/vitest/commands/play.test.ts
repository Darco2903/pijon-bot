import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChannelType, Collection, MessageFlags, type EmbedBuilder } from "discord.js";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { fakeInteraction } from "../fakes/discord.js";

vi.mock("../../../src/music-player/AudioPlayer.js", () => ({
    AudioPlayer: { get: vi.fn(), getOrCreate: vi.fn() },
}));
vi.mock("../../../src/music-player/resolve.js", () => ({ resolveTrackId: vi.fn() }));
vi.mock("../../../src/yt-dlp/index.js", () => ({ ytDlp: { search: vi.fn() } }));
vi.mock("../../../src/prisma.js", () => ({
    prisma: {
        safe: <T>(promise: Promise<T>) => ResultAsync.fromPromise(promise, (e) => e as Error),
        recently_played: { findMany: vi.fn() },
    },
}));

const { AudioPlayer } = await import("../../../src/music-player/AudioPlayer.js");
const { resolveTrackId } = await import("../../../src/music-player/resolve.js");
const { ytDlp } = await import("../../../src/yt-dlp/index.js");
const { prisma } = await import("../../../src/prisma.js");
const { default: play } = await import("../../../src/commands/play.js");

const song = { id: "abc", title: "Song", webpage_url: "https://youtu.be/abc", duration: 180 };
const voiceChannel = { id: "voice-1", type: ChannelType.GuildVoice };

function fakeGuild(userChannel: unknown = null) {
    return {
        id: "guild-1",
        members: { cache: new Collection([["user-1", { voice: { channel: userChannel } }]]) },
    };
}

/** A /play interaction from user-1, channels resolve to themselves */
function playInteraction(options: Parameters<typeof fakeInteraction>[0] = {}) {
    const known = new Map<string, unknown>([["voice-1", voiceChannel]]);
    return fakeInteraction({
        commandName: "play",
        guild: fakeGuild(voiceChannel),
        strings: { query: "never gonna give you up" },
        resolveChannel: (id) => known.get(id) ?? null,
        ...options,
    });
}

function withPlayer(playResult: ResultAsync<unknown, string>) {
    const player = { play: vi.fn(() => playResult) };
    vi.mocked(AudioPlayer.getOrCreate).mockReturnValue(player as never);
    return player;
}

function editedEmbed(interaction: ReturnType<typeof fakeInteraction>): EmbedBuilder {
    const calls = interaction.editReply.mock.calls as unknown[][];
    return (calls[calls.length - 1][0] as { embeds: EmbedBuilder[] }).embeds[0];
}

function autocomplete(query: string) {
    return fakeInteraction({ commandName: "play", strings: { query } });
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AudioPlayer.get).mockReturnValue(undefined);
    vi.mocked(resolveTrackId).mockReturnValue(okAsync("abc"));
});

describe("/play", () => {
    it("refuses outside a server", async () => {
        const interaction = playInteraction({ guild: null });

        await play.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: "This command can only be used in a server.",
            flags: MessageFlags.Ephemeral,
        });
    });

    it("asks to join a channel when there's none to play in", async () => {
        const interaction = playInteraction({ guild: fakeGuild(null) });

        await play.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: "Join a voice channel or specify one.",
            flags: MessageFlags.Ephemeral,
        });
        expect(resolveTrackId).not.toHaveBeenCalled();
    });

    it("refuses a channel that isn't a voice channel", async () => {
        const interaction = playInteraction({
            channels: { channel: { id: "text-1", type: ChannelType.GuildText } },
            resolveChannel: () => ({ id: "text-1", type: ChannelType.GuildText }),
        });

        await play.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: "That's not a voice channel.",
            flags: MessageFlags.Ephemeral,
        });
    });

    it("plays the resolved song in the user's channel", async () => {
        const player = withPlayer(okAsync({ track: song, queued: false, position: 0 }));
        const interaction = playInteraction();

        await play.execute(interaction as never);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(resolveTrackId).toHaveBeenCalledWith("never gonna give you up");
        expect(player.play).toHaveBeenCalledWith("abc", voiceChannel);
        const embed = editedEmbed(interaction).toJSON();
        expect(embed.author?.name).toBe("Now playing");
        expect(embed.title).toBe("Song");
    });

    it("falls back to the channel the player is in", async () => {
        const player = withPlayer(okAsync({ track: song, queued: false, position: 0 }));
        vi.mocked(AudioPlayer.get).mockReturnValue({ voiceChannel } as never);
        const interaction = playInteraction({ guild: fakeGuild(null) });

        await play.execute(interaction as never);

        expect(player.play).toHaveBeenCalledWith("abc", voiceChannel);
    });

    it("says a queued song is up next", async () => {
        withPlayer(okAsync({ track: song, queued: true, position: 1 }));
        const interaction = playInteraction();

        await play.execute(interaction as never);

        expect(editedEmbed(interaction).toJSON().author?.name).toBe("Added to queue · up next");
    });

    it("shows the queue position further down", async () => {
        withPlayer(okAsync({ track: song, queued: true, position: 3 }));
        const interaction = playInteraction();

        await play.execute(interaction as never);

        expect(editedEmbed(interaction).toJSON().author?.name).toBe("Added to queue · #3");
    });

    it("shows the resolve error", async () => {
        vi.mocked(resolveTrackId).mockReturnValue(errAsync("No results for *xyz*."));
        const interaction = playInteraction();

        await play.execute(interaction as never);

        expect(interaction.editReply).toHaveBeenCalledWith("No results for *xyz*.");
        expect(AudioPlayer.getOrCreate).not.toHaveBeenCalled();
    });

    it("shows the play error", async () => {
        withPlayer(errAsync("I couldn't load this song."));
        const interaction = playInteraction();

        await play.execute(interaction as never);

        expect(interaction.editReply).toHaveBeenCalledWith("I couldn't load this song.");
    });
});

describe("/play autocomplete", () => {
    it("suggests nothing for a URL", async () => {
        const interaction = autocomplete("https://youtu.be/abc");

        await play.autoComplete!(interaction as never);

        expect(interaction.respond).toHaveBeenCalledWith([]);
        expect(ytDlp.search).not.toHaveBeenCalled();
    });

    it("suggests recently played songs for an empty query", async () => {
        vi.mocked(prisma.recently_played.findMany).mockResolvedValue([
            { title: "Song", video_id: "abc" },
            { title: "Other", video_id: "def" },
        ] as never);
        const interaction = autocomplete("");

        await play.autoComplete!(interaction as never);

        expect(prisma.recently_played.findMany).toHaveBeenCalledWith({
            orderBy: { played_at: "desc" },
            take: 25,
        });
        expect(interaction.respond).toHaveBeenCalledWith([
            { name: "Song", value: "abc" },
            { name: "Other", value: "def" },
        ]);
    });

    it("suggests nothing when the database fails", async () => {
        vi.mocked(prisma.recently_played.findMany).mockRejectedValue(new Error("down"));
        const interaction = autocomplete("");

        await play.autoComplete!(interaction as never);

        expect(interaction.respond).toHaveBeenCalledWith([]);
    });

    it("suggests search results for a query", async () => {
        vi.mocked(ytDlp.search).mockReturnValue(
            okAsync([
                { id: "abc", title: "Song" },
                { id: "def", title: "Other" },
            ]) as never,
        );
        const interaction = autocomplete("rick");

        await play.autoComplete!(interaction as never);

        expect(ytDlp.search).toHaveBeenCalledWith("rick", 10);
        expect(interaction.respond).toHaveBeenCalledWith([
            { name: "Song", value: "abc" },
            { name: "Other", value: "def" },
        ]);
    });

    it("suggests nothing when the search fails", async () => {
        vi.mocked(ytDlp.search).mockReturnValue(errAsync("yt-dlp failed") as never);
        const interaction = autocomplete("rick");

        await play.autoComplete!(interaction as never);

        expect(interaction.respond).toHaveBeenCalledWith([]);
    });

    it("doesn't throw when responding fails", async () => {
        vi.mocked(ytDlp.search).mockReturnValue(okAsync([]) as never);
        const interaction = autocomplete("rick");
        interaction.respond.mockRejectedValue(new Error("Unknown interaction"));

        await expect(play.autoComplete!(interaction as never)).resolves.toBeUndefined();
    });
});
