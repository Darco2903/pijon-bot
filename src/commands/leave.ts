import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/BotCommand.js";
import { leaveVoice } from "../voice.js";

const command: BotCommand = {
    data: new SlashCommandBuilder().setName("leave").setDescription("Leaves the voice channel"),
    async execute(interaction) {
        if (!interaction.guild) {
            await interaction.reply("This command can only be used in a server.");
            return;
        }

        if (leaveVoice(interaction.guild.id)) {
            await interaction.reply("Left the voice channel.");
        } else {
            await interaction.reply("I am not connected to a voice channel.");
        }
    },
};

export default command;
