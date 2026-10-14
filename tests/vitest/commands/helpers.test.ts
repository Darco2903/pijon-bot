import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageFlags } from "discord.js";
import { fakeInteraction } from "../fakes/discord.js";

vi.mock("../../../src/music-player/AudioPlayer.js", () => ({
    AudioPlayer: { get: vi.fn() },
}));

const { AudioPlayer } = await import("../../../src/music-player/AudioPlayer.js");
const { getActivePlayer, replyError, trackName } = await import("../../../src/commands/helpers.js");

const song = { id: "abc", title: "Song", webpage_url: "https://youtu.be/abc" };

beforeEach(() => {
    vi.clearAllMocks();
});

describe("replyError", () => {
    it("replies ephemerally when nothing was sent yet", async () => {
        const interaction = fakeInteraction();

        await replyError(interaction as never, "Nope.");

        expect(interaction.reply).toHaveBeenCalledWith({
            content: "Nope.",
            flags: MessageFlags.Ephemeral,
        });
        expect(interaction.editReply).not.toHaveBeenCalled();
    });

    it("edits the reply when it was deferred", async () => {
        const interaction = fakeInteraction({ deferred: true });

        await replyError(interaction as never, "Nope.");

        expect(interaction.editReply).toHaveBeenCalledWith("Nope.");
        expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("edits the reply when it was already sent", async () => {
        const interaction = fakeInteraction({ replied: true });

        await replyError(interaction as never, "Nope.");

        expect(interaction.editReply).toHaveBeenCalledWith("Nope.");
    });
});

describe("getActivePlayer", () => {
    it("refuses outside a server", async () => {
        const interaction = fakeInteraction({ guild: null });

        expect(await getActivePlayer(interaction as never)).toBeNull();
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({ content: "This command can only be used in a server." }),
        );
    });

    it("says nothing is playing without a player", async () => {
        const interaction = fakeInteraction({ guild: { id: "guild-1" } });
        vi.mocked(AudioPlayer.get).mockReturnValue(undefined);

        expect(await getActivePlayer(interaction as never)).toBeNull();
        expect(AudioPlayer.get).toHaveBeenCalledWith("guild-1");
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({ content: "Nothing is playing." }),
        );
    });

    it("says nothing is playing when the player is idle", async () => {
        const interaction = fakeInteraction({ guild: { id: "guild-1" } });
        vi.mocked(AudioPlayer.get).mockReturnValue({
            playing: false,
            paused: false,
            currentSong: song,
        } as never);

        expect(await getActivePlayer(interaction as never)).toBeNull();
    });

    it("says nothing is playing without a current song", async () => {
        const interaction = fakeInteraction({ guild: { id: "guild-1" } });
        vi.mocked(AudioPlayer.get).mockReturnValue({
            playing: true,
            paused: false,
            currentSong: null,
        } as never);

        expect(await getActivePlayer(interaction as never)).toBeNull();
    });

    it("returns a playing player", async () => {
        const interaction = fakeInteraction({ guild: { id: "guild-1" } });
        const player = { playing: true, paused: false, currentSong: song };
        vi.mocked(AudioPlayer.get).mockReturnValue(player as never);

        expect(await getActivePlayer(interaction as never)).toBe(player);
        expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("returns a paused player", async () => {
        const interaction = fakeInteraction({ guild: { id: "guild-1" } });
        const player = { playing: false, paused: true, currentSong: song };
        vi.mocked(AudioPlayer.get).mockReturnValue(player as never);

        expect(await getActivePlayer(interaction as never)).toBe(player);
    });
});

describe("trackName", () => {
    it("bolds the title", () => {
        expect(trackName(song)).toBe("**Song**");
    });

    it("escapes markdown in the title", () => {
        expect(trackName({ ...song, title: "a*b_c" })).toBe("**a\\*b\\_c**");
    });
});
