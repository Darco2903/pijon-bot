import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/BotCommand.js";
import { AudioPlayer } from "../music-player/AudioPlayer.js";

const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("seek")
        .setDescription("Seeks to a specific time in the current song")
        .addNumberOption((option) =>
            option.setName("time").setDescription("The time to seek to").setRequired(true),
        ),
    async execute(interaction) {
        const guild = interaction.guild;
        if (!guild) {
            await interaction.reply("This command can only be used in a server.");
            return;
        }

        const time = interaction.options.getNumber("time", true);

        await interaction.deferReply();

        const player = AudioPlayer.get(guild.id);
        if (!player) {
            await interaction.editReply("No audio player found for this guild.");
            return;
        }

        if (!player.playing && !player.paused) {
            await interaction.editReply("No song is currently playing.");
            return;
        }

        await player.seek(time);

        await interaction.editReply(`Seeked to ${time} seconds in the current song.`);
    },
};

export default command;
