import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/BotCommand.js";
import { AudioPlayer } from "../music-player/AudioPlayer.js";
import { Track } from "../music-player/types/Track.js";

const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("previous")
        .setDescription("Plays the previous song in the queue"),
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

        if (!player.hasPrevious) {
            await interaction.reply("No previous song in the queue.");
            return;
        }

        await player.previous().match(
            async (track) => {
                const t = new Track(track);
                await interaction.reply({
                    content: "Playing the previous song",
                    embeds: [t.embed()],
                });
            },
            async (error) => {
                await interaction.reply("Failed to play the previous song.");
                player.destroy();
            },
        );
    },
};
export default command;
