import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/BotCommand.js";
import { Track } from "../music-player/types/Track.js";
import { logger } from "../logger.js";
import { getActivePlayer, replyError } from "./helpers.js";

const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("next")
        .setDescription("Plays the next song in the queue"),
    async execute(interaction) {
        const player = await getActivePlayer(interaction);
        if (!player) return;

        if (!player.hasNext) {
            await replyError(interaction, "There's no next song in the queue.");
            return;
        }

        // starting a song can wait for a download
        await interaction.deferReply();

        await player.skip().match(
            async ({ track, skipped }) => {
                const embed = new Track(track).embed("Now playing");
                if (skipped.length > 0) {
                    embed.setFooter({
                        text: `Skipped ${skipped.length} song${skipped.length > 1 ? "s" : ""} that couldn't be played`,
                    });
                }
                await interaction.editReply({ embeds: [embed] });
            },
            async (error) => {
                logger.warn(`/next failed in guild ${player.guildId}: ${error}`);
                // skip() errors are user-facing
                await interaction.editReply(error);
            },
        );
    },
};
export default command;
