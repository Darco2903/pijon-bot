import { SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../types/BotCommand.js";
import { AudioPlayer } from "../music-player/AudioPlayer.js";

const command: BotCommand = {
    data: new SlashCommandBuilder().setName("pause").setDescription("Pauses the current song"),
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

        if (!player.playing) {
            await interaction.reply("No song is currently playing.");
            return;
        }

        if (player.pause()) {
            await interaction.reply("Current song paused.");
        } else {
            await interaction.reply("Failed to pause the current song.");
        }
    },
};

export default command;
