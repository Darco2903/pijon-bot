import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/BotCommand.js";
import { AudioPlayer } from "../music-player/AudioPlayer.js";

const command: BotCommand = {
    data: new SlashCommandBuilder().setName("stop").setDescription("Stops the current song"),
    async execute(interaction) {
        const guild = interaction.guild;
        if (!guild) {
            await interaction.reply("This command can only be used in a server.");
            return;
        }

        const player = AudioPlayer.get(guild.id);

        if (!player) {
            await interaction.reply("No audio player found for this guild.");
            return;
        }

        if (!player.playing && !player.paused) {
            await interaction.reply("No song is currently playing.");
            return;
        }

        if (player.stop()) {
            await interaction.reply("Stopped the current song.");
        } else {
            await interaction.reply("Failed to stop the current song.");
        }

        player.destroy();
    },
};
export default command;
