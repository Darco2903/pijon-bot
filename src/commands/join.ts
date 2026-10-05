import { ChannelType, SlashCommandBuilder } from "discord.js";
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
        if (!interaction.guild) {
            await interaction.reply("This command can only be used in a server.");
            return;
        }
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

        await joinVoice(channel.id, interaction.guild).match(
            async (conn) => {
                await interaction.editReply(`Joined the voice channel: ${channel.name}`);
            },
            async (error) => {
                logger.error(`Failed to join voice channel: ${error}`);
                await interaction.editReply("Failed to join the voice channel.");
            },
        );
    },
};

export default command;
