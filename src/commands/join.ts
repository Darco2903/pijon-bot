import { ChannelType, SlashCommandBuilder } from "discord.js";
import { createAudioResource, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { BotCommand } from "../types/BotCommand.js";

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

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        connection.on(VoiceConnectionStatus.Ready, async () => {
            // console.log("The connection has entered the Ready state - ready to play audio!");
            await interaction.reply(`Joined the voice channel: ${channel.name}`);
            // createAudioResource()
        });
    },
};

export default command;
