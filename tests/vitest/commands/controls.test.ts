import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageFlags, type EmbedBuilder } from "discord.js";
import { errAsync, okAsync } from "neverthrow";
import { fakeInteraction } from "../fakes/discord.js";

vi.mock("../../../src/music-player/AudioPlayer.js", () => ({ AudioPlayer: { get: vi.fn() } }));

const { AudioPlayer } = await import("../../../src/music-player/AudioPlayer.js");
const { default: pause } = await import("../../../src/commands/pause.js");
const { default: resume } = await import("../../../src/commands/resume.js");
const { default: stop } = await import("../../../src/commands/stop.js");
const { default: next } = await import("../../../src/commands/next.js");
const { default: previous } = await import("../../../src/commands/previous.js");
const { default: seek } = await import("../../../src/commands/seek.js");

const song = {
    id: "abc",
    title: "Song",
    webpage_url: "https://youtu.be/abc",
    duration: 180,
    channel: "Artist",
};
const other = { id: "def", title: "Other", webpage_url: "https://youtu.be/def", duration: 60 };

function fakePlayer(overrides: Record<string, unknown> = {}) {
    return {
        guildId: "guild-1",
        playing: true,
        paused: false,
        currentSong: song,
        hasNext: true,
        hasPrevious: true,
        positionMs: { time: 65_000 },
        pause: vi.fn(() => true),
        resume: vi.fn(() => true),
        destroy: vi.fn(),
        skip: vi.fn(),
        previous: vi.fn(),
        seek: vi.fn(),
        ...overrides,
    };
}

function withPlayer(overrides: Record<string, unknown> = {}) {
    const player = fakePlayer(overrides);
    vi.mocked(AudioPlayer.get).mockReturnValue(player as never);
    return player;
}

function guildInteraction(options: Parameters<typeof fakeInteraction>[0] = {}) {
    return fakeInteraction({ guild: { id: "guild-1" }, ...options });
}

function ephemeral(content: string) {
    return { content, flags: MessageFlags.Ephemeral };
}

/** The embed sent with editReply */
function editedEmbed(interaction: ReturnType<typeof guildInteraction>): EmbedBuilder {
    const calls = interaction.editReply.mock.calls as unknown[][];
    const payload = calls[calls.length - 1][0] as { embeds: EmbedBuilder[] };
    return payload.embeds[0];
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("every control command", () => {
    it.each([
        ["pause", pause],
        ["resume", resume],
        ["stop", stop],
        ["next", next],
        ["previous", previous],
        ["seek", seek],
    ])("/%s says nothing is playing without a player", async (_name, command) => {
        vi.mocked(AudioPlayer.get).mockReturnValue(undefined);
        const interaction = guildInteraction({ numbers: { time: 10 } });

        await command.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(ephemeral("Nothing is playing."));
    });
});

describe("/pause", () => {
    it("refuses when already paused", async () => {
        const player = withPlayer({ playing: false, paused: true });
        const interaction = guildInteraction();

        await pause.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(ephemeral("The song is already paused."));
        expect(player.pause).not.toHaveBeenCalled();
    });

    it("pauses and shows the position", async () => {
        const player = withPlayer();
        const interaction = guildInteraction();

        await pause.execute(interaction as never);

        expect(player.pause).toHaveBeenCalled();
        expect(interaction.reply).toHaveBeenCalledWith("⏸️ Paused **Song** at `01:05`");
    });

    it("says when the pause failed", async () => {
        withPlayer({ pause: vi.fn(() => false) });
        const interaction = guildInteraction();

        await pause.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(ephemeral("Couldn't pause the song."));
    });
});

describe("/resume", () => {
    it("refuses when not paused", async () => {
        const player = withPlayer();
        const interaction = guildInteraction();

        await resume.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(ephemeral("The song isn't paused."));
        expect(player.resume).not.toHaveBeenCalled();
    });

    it("resumes", async () => {
        const player = withPlayer({ playing: false, paused: true });
        const interaction = guildInteraction();

        await resume.execute(interaction as never);

        expect(player.resume).toHaveBeenCalled();
        expect(interaction.reply).toHaveBeenCalledWith("▶️ Resumed **Song**");
    });

    it("says when resuming failed", async () => {
        withPlayer({ playing: false, paused: true, resume: vi.fn(() => false) });
        const interaction = guildInteraction();

        await resume.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(ephemeral("Couldn't resume the song."));
    });
});

describe("/stop", () => {
    it("destroys the player and replies", async () => {
        const player = withPlayer();
        const interaction = guildInteraction();

        await stop.execute(interaction as never);

        expect(player.destroy).toHaveBeenCalledTimes(1);
        expect(interaction.reply).toHaveBeenCalledWith(
            "⏹️ Stopped the music and cleared the queue.",
        );
    });
});

describe("/next", () => {
    it("refuses without a next song", async () => {
        const player = withPlayer({ hasNext: false });
        const interaction = guildInteraction();

        await next.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
            ephemeral("There's no next song in the queue."),
        );
        expect(player.skip).not.toHaveBeenCalled();
    });

    it("shows the new song", async () => {
        withPlayer({ skip: vi.fn(() => okAsync({ track: other, skipped: [] })) });
        const interaction = guildInteraction();

        await next.execute(interaction as never);

        expect(interaction.deferReply).toHaveBeenCalled();
        const embed = editedEmbed(interaction).toJSON();
        expect(embed.author?.name).toBe("Now playing");
        expect(embed.title).toBe("Other");
        expect(embed.footer).toBeUndefined();
    });

    it("mentions one skipped song in the footer", async () => {
        withPlayer({ skip: vi.fn(() => okAsync({ track: other, skipped: [song] })) });
        const interaction = guildInteraction();

        await next.execute(interaction as never);

        expect(editedEmbed(interaction).toJSON().footer?.text).toBe(
            "Skipped 1 song that couldn't be played",
        );
    });

    it("mentions several skipped songs in the footer", async () => {
        withPlayer({ skip: vi.fn(() => okAsync({ track: other, skipped: [song, song] })) });
        const interaction = guildInteraction();

        await next.execute(interaction as never);

        expect(editedEmbed(interaction).toJSON().footer?.text).toBe(
            "Skipped 2 songs that couldn't be played",
        );
    });

    it("shows the skip error", async () => {
        withPlayer({
            skip: vi.fn(() =>
                errAsync("None of the next songs could be played, the queue is over."),
            ),
        });
        const interaction = guildInteraction();

        await next.execute(interaction as never);

        expect(interaction.editReply).toHaveBeenCalledWith(
            "None of the next songs could be played, the queue is over.",
        );
    });
});

describe("/previous", () => {
    it("refuses without a previous song", async () => {
        const player = withPlayer({ hasPrevious: false });
        const interaction = guildInteraction();

        await previous.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
            ephemeral("There's no previous song in the queue."),
        );
        expect(player.previous).not.toHaveBeenCalled();
    });

    it("shows the previous song", async () => {
        withPlayer({ previous: vi.fn(() => okAsync(other)) });
        const interaction = guildInteraction();

        await previous.execute(interaction as never);

        const embed = editedEmbed(interaction).toJSON();
        expect(embed.author?.name).toBe("Now playing");
        expect(embed.title).toBe("Other");
    });

    it("shows a generic message on error", async () => {
        withPlayer({ previous: vi.fn(() => errAsync("technical details")) });
        const interaction = guildInteraction();

        await previous.execute(interaction as never);

        expect(interaction.editReply).toHaveBeenCalledWith("Couldn't play the previous song.");
    });
});

describe("/seek", () => {
    it("refuses in a live stream", async () => {
        const player = withPlayer({ currentSong: { ...song, is_live: true } });
        const interaction = guildInteraction({ numbers: { time: 10 } });

        await seek.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(ephemeral("Can't seek in a live stream."));
        expect(player.seek).not.toHaveBeenCalled();
    });

    it("refuses past the end of the song", async () => {
        const player = withPlayer();
        const interaction = guildInteraction({ numbers: { time: 181 } });

        await seek.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
            ephemeral("This song is only `03:00` long."),
        );
        expect(player.seek).not.toHaveBeenCalled();
    });

    it("seeks and shows the new position", async () => {
        const player = withPlayer({ seek: vi.fn(() => okAsync(undefined)) });
        const interaction = guildInteraction({ numbers: { time: 90 } });

        await seek.execute(interaction as never);

        expect(player.seek).toHaveBeenCalledTimes(1);
        expect(player.seek.mock.calls[0][0]).toMatchObject({ time: 90 });
        expect(interaction.editReply).toHaveBeenCalledWith("⏩ **Song** `01:30 / 03:00`");
    });

    it("allows any time when the duration is unknown", async () => {
        const player = withPlayer({
            currentSong: { ...song, duration: null },
            seek: vi.fn(() => okAsync(undefined)),
        });
        const interaction = guildInteraction({ numbers: { time: 5000 } });

        await seek.execute(interaction as never);

        expect(player.seek).toHaveBeenCalledTimes(1);
    });

    it("shows a generic message on error", async () => {
        withPlayer({ seek: vi.fn(() => errAsync("technical details")) });
        const interaction = guildInteraction({ numbers: { time: 90 } });

        await seek.execute(interaction as never);

        expect(interaction.editReply).toHaveBeenCalledWith("Couldn't seek in the song.");
    });
});
