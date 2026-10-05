import { SlashCommandBuilder } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import type { BotCommand } from "../types/BotCommand.js";

const command: BotCommand = {
    data: new SlashCommandBuilder().setName("leave").setDescription("Leaves the voice channel"),
    async execute(interaction) {
        if (!interaction.guild) {
            await interaction.reply("This command can only be used in a server.");
            return;
        }

        const conn = getVoiceConnection(interaction.guild.id);
        if (!conn) {
            await interaction.reply("I am not connected to a voice channel.");
            return;
        }

        conn.destroy();
        await interaction.reply("Left the voice channel.");
    },
};

export default command;
