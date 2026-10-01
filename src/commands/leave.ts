import { SlashCommandBuilder } from "discord.js";
import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    getVoiceConnection,
    NoSubscriberBehavior,
} from "@discordjs/voice";
import { BotCommand } from "../types/BotCommand.js";
import { logger } from "../logger.js";
import { textToSpeech } from "../fish_audio/index.js";
import { readableStreamToReadable } from "../utils.js";

const command: BotCommand = {
    data: new SlashCommandBuilder().setName("leave").setDescription("Leaves the voice channel"),
    async execute(interaction) {
        if (!interaction.guild) {
            await interaction.reply("This command can only be used in a server.");
            return;
        }

        const connection = getVoiceConnection(interaction.guild.id);
        if (!connection) {
            await interaction.reply("I am not connected to a voice channel.");
            return;
        }

        await interaction.deferReply();

        await textToSpeech("I'm leaving the voice channel guys. Bye!")
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

                await new Promise<void>((resolve, reject) => {
                    player.on(AudioPlayerStatus.Idle, () => {
                        connection.destroy();
                        interaction.editReply(`Left the voice channel.`);
                        resolve();
                    });
                });
            })
            .orTee(async (error) => {
                logger.error(`Failed to convert text to speech: ${error}`);
                await interaction.followUp("Failed to convert text to speech.");
            });
    },
};

export default command;
