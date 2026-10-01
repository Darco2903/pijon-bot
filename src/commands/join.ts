import { ChannelType, SlashCommandBuilder } from "discord.js";
import {
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import { BotCommand } from "../types/BotCommand.js";
import { textToSpeech } from "../fish_audio/index.js";
import { logger } from "../logger.js";
import { Readable } from "stream";
import { ReadableStream } from "stream/web";
import { readableStreamToReadable } from "../utils.js";
import { ResultAsync } from "neverthrow";

const command: BotCommand = {
    data: new SlashCommandBuilder()
        .setName("join")
        .setDescription("Joins the voice channel")
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("The voice channel to join")
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildVoice),
        ),
    async execute(interaction) {
        if (!interaction.guild) {
            await interaction.reply("This command can only be used in a server.");
            return;
        }
        const channel =
            interaction.options.getChannel("channel") ??
            interaction.guild?.members.cache.get(interaction.user.id)?.voice.channel;

        if (!channel) {
            await interaction.reply("Please specify a voice channel to join.");
            return;
        }

        if (channel.type !== ChannelType.GuildVoice) {
            await interaction.reply("Please specify a valid voice channel.");
            return;
        }

        await interaction.deferReply();

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        await ResultAsync.fromPromise(
            //
            entersState(connection, VoiceConnectionStatus.Ready, 5_000),
            (error) => (error instanceof Error ? error.message : String(error)),
        )
            .andTee(async () => {
                // console.log("The connection has entered the Ready state - ready to play audio!");
                await interaction.editReply(`Joined the voice channel: ${channel.name}`);

                await textToSpeech("Hello, I have joined the voice channel!")
                    .andTee(async (stream) => {
                        await interaction.followUp("Successfully converted text to speech.");
                        const resource = createAudioResource(readableStreamToReadable(stream));
                        const player = createAudioPlayer({
                            behaviors: {
                                noSubscriber: NoSubscriberBehavior.Pause,
                            },
                        });
                        connection.subscribe(player);
                        player.play(resource);
                    })
                    .orTee(async (error) => {
                        logger.error(`Failed to convert text to speech: ${error}`);
                        await interaction.followUp("Failed to convert text to speech.");
                    });
            })
            .orTee(async (error) => {
                logger.error(`Failed to join voice channel: ${error}`);
                await interaction.editReply("Failed to join the voice channel.");
                connection.destroy();
            });
    },
};

export default command;
