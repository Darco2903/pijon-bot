const { Command } = require("../../utils");
const { Interaction, SlashCommandBuilder, ChannelType } = require("discord.js");
const CustomDistube = require("../CustomDistube");

let data;
let execute;

data = new SlashCommandBuilder()
    .setName("channel")
    .setDescription("[Music] Gestion du salon vocal")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("join")
            .setDescription("Fais venir le bot dans un salon vocal")
            .addChannelOption((option) => option.setName("channel").setDescription("Salon vocal").addChannelTypes(ChannelType.GuildVoice).setRequired(true))
    )
    .addSubcommand((subcommand) => subcommand.setName("leave").setDescription("Fais partir le bot du salon vocal"));

/** @param {Interaction} interaction */
execute = async function (interaction) {
    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    const oldChannel = distube.voices.get(interaction.guildId)?.channel;

    await interaction.deferReply();

    switch (interaction.options.getSubcommand()) {
        case "join":
            const channel = interaction.options.getChannel("channel");

            if (channel.id === oldChannel?.id) {
                await interaction.editReply("Je suis déjà dans ce salon eft");
                break;
            }

            await distube.voices.join(channel);

            if (oldChannel) {
                await interaction.editReply(`Passage de **${oldChannel.name}** à **${channel.name}**`);
            } else {
                await interaction.editReply(`Arrivin' in **${channel.name}**`);
            }
            break;

        case "leave":
            if (!oldChannel) {
                await interaction.editReply("Je ne suis pas dans salon vocal  *idiot* :lock~1:");
                break;
            }
            distube.voices.leave(interaction.guildId);
            await interaction.editReply(`Quitting the quit **${oldChannel.name}**`);
            break;
    }
    return Promise.resolve();
};

module.exports = new Command({ data, execute });
