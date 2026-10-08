import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/BotCommand.js";
import { Track } from "../music-player/types/Track.js";
import { logger } from "../logger.js";
import { getActivePlayer, replyError } from "./helpers.js";

const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("previous")
        .setDescription("Plays the previous song in the queue"),
    async execute(interaction) {
        const player = await getActivePlayer(interaction);
        if (!player) return;

        if (!player.hasPrevious) {
            await replyError(interaction, "There's no previous song in the queue.");
            return;
        }

        // starting a song can wait for a download
        await interaction.deferReply();

        await player.previous().match(
            async (track) => {
                const embed = new Track(track).embed("Now playing");
                await interaction.editReply({ embeds: [embed] });
            },
            async (error) => {
                logger.warn(`/previous failed in guild ${player.guildId}: ${error}`);
                await interaction.editReply("Couldn't play the previous song.");
            },
        );
    },
};
export default command;
