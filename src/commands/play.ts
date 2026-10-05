import { ApplicationCommandOptionChoiceData, ChannelType, SlashCommandBuilder } from "discord.js";
import { NoSubscriberBehavior } from "@discordjs/voice";
import { BotCommand } from "../types/BotCommand.js";
import { getVideoID, validateID, validateURL, ytDlp } from "../yt-dlp/index.js";
import { AudioPlayer } from "../music-player/AudioPlayer.js";
import { prisma } from "../prisma.js";
import { Track } from "../music-player/types/Track.js";
import { logger } from "../logger.js";

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
            await interaction.reply("This command can only be used in a server.");
            return;
        }

        let query = interaction.options.getString("query", true);

        const ch =
            interaction.options.getChannel("channel")
            ?? interaction.guild?.members.cache.get(interaction.user.id)?.voice.channel;

        if (!ch) {
            await interaction.reply("Please specify a voice channel to join.");
            return;
        }

        const channel = interaction.client.channels.resolve(ch.id);

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            await interaction.reply("Please specify a valid voice channel.");
            return;
        }

        await interaction.deferReply();

        let audioPlayer = AudioPlayer.get(guild.id);
        if (!audioPlayer) {
            audioPlayer = new AudioPlayer(guild.id, {
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Pause,
                },
            });

            logger.debug(`Created new AudioPlayer for guild ${guild.id}`);
        } else {
            logger.debug(`Using existing AudioPlayer for guild ${guild.id}`);
        }

        logger.debug(`query: ${query}`);

        let id: string;
        if (!validateID(query) && !validateURL(query)) {
            const res = await ytDlp.search(query, 1);
            if (res.isErr()) {
                logger.error(`Failed to search for query "${query}": ${res.error}`);
                await interaction.followUp("An error occurred while searching for your song");
                return;
            }

            const searchResults = res.value;
            if (searchResults.length === 0) {
                logger.debug(`No search results found for query "${query}"`);
                await interaction.followUp(`No results found for *${query}*`);
                return;
            }
            // logger.debug(`Search results: ${searchResults.map((r) => r.title).join(", ")}`);
            const firstResult = searchResults[0];
            id = firstResult.id;
            logger.debug(`First search result: ${firstResult.title}`);
        } else if (validateURL(query)) {
            id = getVideoID(query);
        } else {
            id = query;
        }

        await audioPlayer.play(id, channel).match(
            async (track) => {
                logger.debug(`Playing track ${track.title} (${track.id}) in guild ${guild.id}`);
                const t = new Track(track);
                // await interaction.followUp("Playing your song!");
                await interaction.followUp({
                    embeds: [t.embed()],
                });
            },
            async (error) => {
                logger.error(`Failed to play track: ${error}`);
                await interaction.followUp("An error occurred while trying to play your song");
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
                .safe(prisma.recently_played.findMany({ orderBy: { played_at: "desc" }, take: 15 }))
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
                .search(query, 15)
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
