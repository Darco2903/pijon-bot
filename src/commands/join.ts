import { ChannelType, SlashCommandBuilder } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import type { BotCommand } from "../types/BotCommand.js";
import { joinVoice } from "../voice.js";
import { logger } from "../logger.js";

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
        const guild = interaction.guild;
        if (!guild) {
            await interaction.reply("This command can only be used in a server.");
            return;
        }

        const channel =
            interaction.options.getChannel("channel")
            ?? guild.members.cache.get(interaction.user.id)?.voice.channel;

        if (!channel) {
            await interaction.reply("Join a voice channel or specify one.");
            return;
        }

        if (channel.type !== ChannelType.GuildVoice) {
            await interaction.reply("Please specify a valid voice channel.");
            return;
        }

        const conn = getVoiceConnection(guild.id);
        const alreadyHere = conn?.joinConfig.channelId === channel.id;

        await interaction.deferReply();

        await joinVoice(channel.id, guild).match(
            async () => {
                if (alreadyHere) {
                    await interaction.editReply(`I'm already in <#${channel.id}>.`);
                } else {
                    await interaction.editReply(`Joined <#${channel.id}>.`);
                }
            },
            async (error) => {
                logger.debug(`Join refused or failed in guild ${guild.id}: ${error}`);
                // joinVoice errors are user-facing messages
                await interaction.editReply(error);
            },
        );
    },
};

export default command;
