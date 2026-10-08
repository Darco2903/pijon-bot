import { escapeMarkdown, MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { AudioPlayer } from "../music-player/AudioPlayer.js";
import type { ITrack } from "../music-player/types/index.js";

/** Error replies are only shown to the user who ran the command */
export async function replyError(
    interaction: ChatInputCommandInteraction,
    content: string,
): Promise<void> {
    if (interaction.deferred || interaction.replied) {
        // a deferred reply can't become ephemeral anymore
        await interaction.editReply(content);
    } else {
        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
}

/**
 * The guild's player if a song is playing or paused.
 * Otherwise replies with an error and returns null.
 */
export async function getActivePlayer(
    interaction: ChatInputCommandInteraction,
): Promise<AudioPlayer | null> {
    if (!interaction.guild) {
        await replyError(interaction, "This command can only be used in a server.");
        return null;
    }

    const player = AudioPlayer.get(interaction.guild.id);
    if (!player || (!player.playing && !player.paused) || !player.currentSong) {
        await replyError(interaction, "Nothing is playing.");
        return null;
    }
    return player;
}

/** Bold title, safe from markdown in it */
export function trackName(track: ITrack): string {
    return `**${escapeMarkdown(track.title)}**`;
}
