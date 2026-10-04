import { SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../types/BotCommand.js";
import { AudioPlayer } from "../music-player/AudioPlayer.js";

const command: BotCommand = {
    data: new SlashCommandBuilder().setName("resume").setDescription("Resumes the current song"),
    async execute(interaction) {
        if (!interaction.guild) {
            await interaction.reply("This command can only be used in a server.");
            return;
        }

        const player = AudioPlayer.get(interaction.guild.id);

        if (!player) {
            await interaction.reply("No audio player found for this guild.");
            return;
        }

        if (!player.paused) {
            await interaction.reply("The current song is not paused.");
            return;
        }

        if (player.resume()) {
            await interaction.reply("Current song resumed.");
        } else {
            await interaction.reply("Failed to resume the current song.");
        }
    },
};

export default command;
