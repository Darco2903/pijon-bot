import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/BotCommand.js";
import { getActivePlayer } from "./helpers.js";

const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stops the music and clears the queue"),
    async execute(interaction) {
        const player = await getActivePlayer(interaction);
        if (!player) return;

        player.destroy();
        await interaction.reply("⏹️ Stopped the music and cleared the queue.");
    },
};
export default command;
