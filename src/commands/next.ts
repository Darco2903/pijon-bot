import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/BotCommand.js";
import { AudioPlayer } from "../music-player/AudioPlayer.js";

const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("next")
        .setDescription("Plays the next song in the queue"),
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

        if (!player.hasNext) {
            await interaction.reply("No next song in the queue.");
            return;
        }

        const res = await player.next();
        if (res.isOk()) {
            await interaction.reply("Playing the next song.");
        } else {
            await interaction.reply("Failed to play the next song.");
            player.destroy();
        }
    },
};
export default command;
