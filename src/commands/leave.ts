import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/BotCommand.js";
import { leaveVoice } from "../voice.js";
import { replyError } from "./helpers.js";

const command: BotCommand = {
    data: new SlashCommandBuilder().setName("leave").setDescription("Leaves the voice channel"),
    async execute(interaction) {
        if (!interaction.guild) {
            await replyError(interaction, "This command can only be used in a server.");
            return;
        }

        if (leaveVoice(interaction.guild.id)) {
            await interaction.reply("👋 Left the voice channel.");
        } else {
            await replyError(interaction, "I'm not in a voice channel.");
        }
    },
};

export default command;
