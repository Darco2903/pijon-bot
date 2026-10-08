import { SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../types/BotCommand.js";
import { getActivePlayer, replyError, trackName } from "./helpers.js";

const command: BotCommand = {
    data: new SlashCommandBuilder().setName("resume").setDescription("Resumes the current song"),
    async execute(interaction) {
        const player = await getActivePlayer(interaction);
        if (!player) return;

        if (!player.paused) {
            await replyError(interaction, "The song isn't paused.");
            return;
        }

        if (player.resume()) {
            await interaction.reply(`▶️ Resumed ${trackName(player.currentSong!)}`);
        } else {
            await replyError(interaction, "Couldn't resume the song.");
        }
    },
};

export default command;
