import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types/BotCommand.js";
import { Second } from "@darco2903/secondthought";
import { Track } from "../music-player/types/Track.js";
import { formatTime } from "../utils.js";
import { logger } from "../logger.js";
import { getActivePlayer, replyError, trackName } from "./helpers.js";

const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("seek")
        .setDescription("Seeks to a specific time in the current song")
        .addNumberOption((option) =>
            option
                .setName("time")
                .setDescription("The time to seek to, in seconds")
                .setRequired(true)
                .setMinValue(0),
        ),
    async execute(interaction) {
        const player = await getActivePlayer(interaction);
        if (!player) return;

        const track = new Track(player.currentSong!);
        const time = interaction.options.getNumber("time", true);

        if (track.is_live) {
            await replyError(interaction, "Can't seek in a live stream.");
            return;
        }
        if (track.duration && time > track.duration) {
            await replyError(
                interaction,
                `This song is only \`${track.getFormattedDuration()}\` long.`,
            );
            return;
        }

        // restarting the stream can take a moment
        await interaction.deferReply();

        await player.seek(new Second(time)).match(
            async () => {
                await interaction.editReply(
                    `⏩ ${trackName(track)} \`${formatTime(time)} / ${track.getFormattedDuration()}\``,
                );
            },
            async (error) => {
                logger.warn(`/seek failed in guild ${player.guildId}: ${error}`);
                await interaction.editReply("Couldn't seek in the song.");
            },
        );
    },
};

export default command;
