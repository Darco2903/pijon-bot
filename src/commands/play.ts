import { ApplicationCommandOptionChoiceData, ChannelType, SlashCommandBuilder } from "discord.js";
import {
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import { BotCommand } from "../types/BotCommand.js";
import { logger } from "../logger.js";
import { ResultAsync } from "neverthrow";
import { validateID, validateURL, ytDlp } from "../yt-dlp/index.js";
import { AudioPlayer } from "../music-player/AudioPlayer.js";
import { prisma } from "../prisma.js";
import { joinVoice } from "../voice.js";

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

        const channel =
            interaction.options.getChannel("channel")
            ?? interaction.guild?.members.cache.get(interaction.user.id)?.voice.channel;

        if (!channel) {
            await interaction.reply("Please specify a voice channel to join.");
            return;
        }

        if (channel.type !== ChannelType.GuildVoice) {
            await interaction.reply("Please specify a valid voice channel.");
            return;
        }

        await interaction.deferReply();

        let conn = getVoiceConnection(guild.id);
        if (!conn) {
            const r = await joinVoice(channel.id, guild);

            if (r.isErr()) {
                logger.error(`Failed to join voice channel: ${r.error}`);
                await interaction.editReply("Failed to join the voice channel.");
                return;
            }

            conn = r.value;

            logger.debug(`Joined the voice channel: ${channel.name}`);
            await interaction.editReply(`Joined the voice channel: ${channel.name}`);
        } else {
            logger.debug(`Already connected to the voice channel: ${channel.name}`);
            await interaction.editReply(`Already connected to the voice channel: ${channel.name}`);
        }

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

        if (validateID(query)) {
            query = `https://youtu.be/${query}`;
        } else if (validateURL(query)) {
            query = query;
        }

        logger.debug(`query: ${query}`);

        const res = await ytDlp.search(query, 1);
        if (res.isErr()) {
            await interaction.followUp(`Failed to search for query "${query}": ${res.error}`);
            return;
        }

        const searchResults = res.value;
        if (searchResults.length === 0) {
            await interaction.followUp(`No results found for query "${query}".`);
            return;
        }
        // logger.debug(`Search results: ${searchResults.map((r) => r.title).join(", ")}`);

        const firstResult = searchResults[0];
        logger.debug(`First search result: ${firstResult.title}`);

        await audioPlayer.play(firstResult);

        await interaction.followUp("Successfully fetched audio stream.");
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

        await interaction.respond(results);
    },
};

export default command;
