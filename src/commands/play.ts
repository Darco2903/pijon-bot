import { ApplicationCommandOptionChoiceData, ChannelType, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "../types/BotCommand.js";
import { AudioPlayer } from "../music-player/AudioPlayer.js";
import { resolveTrackId } from "../music-player/resolve.js";
import { prisma } from "../prisma.js";
import { Track } from "../music-player/types/Track.js";
import { logger } from "../logger.js";
import { ytDlp } from "../yt-dlp/index.js";
import { replyError } from "./helpers.js";

const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Plays music in the voice channel")
        .addStringOption((option) =>
            option
                .setName("query")
                .setDescription("The song to play")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("The voice channel to join")
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildVoice),
        ),
    async execute(interaction) {
        const guild = interaction.guild;
        if (guild === null) {
            await replyError(interaction, "This command can only be used in a server.");
            return;
        }

        const query = interaction.options.getString("query", true);
        const audioPlayer = AudioPlayer.get(guild.id);

        const ch =
            interaction.options.getChannel("channel")
            || interaction.guild?.members.cache.get(interaction.user.id)?.voice.channel
            || audioPlayer?.voiceChannel;

        if (!ch) {
            await replyError(interaction, "Join a voice channel or specify one.");
            return;
        }

        const channel = interaction.client.channels.resolve(ch.id);

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            await replyError(interaction, "That's not a voice channel.");
            return;
        }

        await interaction.deferReply();

        logger.debug(`query: ${query}`);

        await resolveTrackId(query)
            .andThen((id) => AudioPlayer.getOrCreate(guild).play(id, channel))
            .match(
                async ({ track, queued, position }) => {
                    logger.debug(
                        `${queued ? "Queued" : "Playing"} track ${track.title} (${track.id}) in guild ${guild.id}`,
                    );
                    const status =
                        queued ?
                            `Added to queue · ${position === 1 ? "up next" : `#${position}`}`
                        :   "Now playing";
                    await interaction.editReply({ embeds: [new Track(track).embed(status)] });
                },
                async (error) => {
                    logger.error(`Failed to play track: ${error}`);
                    // resolveTrackId() and play() errors are user-facing
                    await replyError(interaction, error);
                },
            );
    },
    async autoComplete(interaction) {
        const query = interaction.options.getString("query", true);
        logger.debug(`Autocomplete query: ${query}`);

        if (query.startsWith("https://") || query.startsWith("http://")) {
            await interaction.respond([]);
            return;
        }

        let results: ApplicationCommandOptionChoiceData<string | number>[];

        if (query.length <= 0) {
            // display recently played songs
            const recentlyPlayed = await prisma
                .safe(prisma.recently_played.findMany({ orderBy: { played_at: "desc" }, take: 25 }))
                .orTee((error) => {
                    logger.error(`Failed to fetch recently played videos: ${error}`);
                })
                .unwrapOr([]);

            results = recentlyPlayed.map((entry) => ({
                name: entry.title,
                value: entry.video_id,
            }));
        } else {
            results = await ytDlp
                .search(query, 10)
                // .andTee((results) => {
                //     console.log("Search:", results);
                // })
                .map((results) =>
                    results.map((result) => ({
                        name: result.title,
                        value: result.id,
                    })),
                )
                .orTee((error) => {
                    logger.error(`Failed to search for query "${query}": ${error}`);
                })
                .unwrapOr([]);
        }

        await interaction.respond(results).catch((error) => {
            logger.error(`Failed to respond to autocomplete interaction: ${error}`);
        });
    },
};

export default command;
