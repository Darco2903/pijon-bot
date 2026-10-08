import { SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../types/BotCommand.js";
import { formatTime } from "../utils.js";
import { getActivePlayer, replyError, trackName } from "./helpers.js";

const command: BotCommand = {
    data: new SlashCommandBuilder().setName("pause").setDescription("Pauses the current song"),
    async execute(interaction) {
        const player = await getActivePlayer(interaction);
        if (!player) return;

        if (player.paused) {
            await replyError(interaction, "The song is already paused.");
            return;
        }

        if (player.pause()) {
            const at = formatTime(player.positionMs.time / 1000);
            await interaction.reply(`⏸️ Paused ${trackName(player.currentSong!)} at \`${at}\``);
        } else {
            await replyError(interaction, "Couldn't pause the song.");
        }
    },
};

export default command;
