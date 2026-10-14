import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChannelType, Collection } from "discord.js";
import { errAsync, okAsync } from "neverthrow";
import { fakeInteraction } from "../fakes/discord.js";

vi.mock("@discordjs/voice", () => ({ getVoiceConnection: vi.fn() }));
vi.mock("../../../src/voice.js", () => ({ joinVoice: vi.fn(), leaveVoice: vi.fn() }));
vi.mock("../../../src/music-player/AudioPlayer.js", () => ({ AudioPlayer: { get: vi.fn() } }));

const { getVoiceConnection } = await import("@discordjs/voice");
const { joinVoice, leaveVoice } = await import("../../../src/voice.js");
const { default: join } = await import("../../../src/commands/join.js");
const { default: leave } = await import("../../../src/commands/leave.js");

const voiceChannel = { id: "voice-1", type: ChannelType.GuildVoice };
const textChannel = { id: "text-1", type: ChannelType.GuildText };

/** A guild where user-1 is in `userChannel` */
function fakeGuild(userChannel: unknown = null) {
    return {
        id: "guild-1",
        members: { cache: new Collection([["user-1", { voice: { channel: userChannel } }]]) },
    };
}

function lastReply(interaction: ReturnType<typeof fakeInteraction>): unknown {
    const replies = interaction.reply.mock.calls as unknown[][];
    const edits = interaction.editReply.mock.calls as unknown[][];
    const reply = replies[replies.length - 1]?.[0] as { content?: string } | undefined;
    const edit = edits[edits.length - 1]?.[0];
    return edit ?? reply?.content ?? reply;
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getVoiceConnection).mockReturnValue(undefined);
});

describe("/join", () => {
    it("refuses outside a server", async () => {
        const interaction = fakeInteraction();

        await join.execute(interaction as never);

        expect(lastReply(interaction)).toBe("This command can only be used in a server.");
        expect(joinVoice).not.toHaveBeenCalled();
    });

    it("asks to join a channel when the user isn't in one and none is given", async () => {
        const interaction = fakeInteraction({ guild: fakeGuild() });

        await join.execute(interaction as never);

        expect(lastReply(interaction)).toBe("Join a voice channel or specify one.");
    });

    it("refuses a channel that isn't a voice channel", async () => {
        const interaction = fakeInteraction({
            guild: fakeGuild(),
            channels: { channel: textChannel },
        });

        await join.execute(interaction as never);

        expect(lastReply(interaction)).toBe("That's not a voice channel.");
        expect(joinVoice).not.toHaveBeenCalled();
    });

    it("joins the user's voice channel", async () => {
        const guild = fakeGuild(voiceChannel);
        const interaction = fakeInteraction({ guild });
        vi.mocked(joinVoice).mockReturnValue(okAsync({}) as never);

        await join.execute(interaction as never);

        expect(joinVoice).toHaveBeenCalledWith("voice-1", guild);
        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith("🔊 Joined <#voice-1>.");
    });

    it("prefers the channel option over the user's channel", async () => {
        const guild = fakeGuild({ id: "voice-2", type: ChannelType.GuildVoice });
        const interaction = fakeInteraction({ guild, channels: { channel: voiceChannel } });
        vi.mocked(joinVoice).mockReturnValue(okAsync({}) as never);

        await join.execute(interaction as never);

        expect(joinVoice).toHaveBeenCalledWith("voice-1", guild);
    });

    it("says when it's already in the channel", async () => {
        const interaction = fakeInteraction({ guild: fakeGuild(voiceChannel) });
        vi.mocked(getVoiceConnection).mockReturnValue({
            joinConfig: { channelId: "voice-1" },
        } as never);
        vi.mocked(joinVoice).mockReturnValue(okAsync({}) as never);

        await join.execute(interaction as never);

        expect(interaction.editReply).toHaveBeenCalledWith("I'm already in <#voice-1>.");
    });

    it("shows the join error", async () => {
        const interaction = fakeInteraction({ guild: fakeGuild(voiceChannel) });
        vi.mocked(joinVoice).mockReturnValue(errAsync("I'm already playing in <#voice-9>."));

        await join.execute(interaction as never);

        expect(interaction.editReply).toHaveBeenCalledWith("I'm already playing in <#voice-9>.");
    });
});

describe("/leave", () => {
    it("refuses outside a server", async () => {
        const interaction = fakeInteraction();

        await leave.execute(interaction as never);

        expect(lastReply(interaction)).toBe("This command can only be used in a server.");
        expect(leaveVoice).not.toHaveBeenCalled();
    });

    it("leaves the voice channel", async () => {
        const interaction = fakeInteraction({ guild: { id: "guild-1" } });
        vi.mocked(leaveVoice).mockReturnValue(true);

        await leave.execute(interaction as never);

        expect(leaveVoice).toHaveBeenCalledWith("guild-1");
        expect(interaction.reply).toHaveBeenCalledWith("👋 Left the voice channel.");
    });

    it("says when it isn't in a voice channel", async () => {
        const interaction = fakeInteraction({ guild: { id: "guild-1" } });
        vi.mocked(leaveVoice).mockReturnValue(false);

        await leave.execute(interaction as never);

        expect(lastReply(interaction)).toBe("I'm not in a voice channel.");
    });
});
