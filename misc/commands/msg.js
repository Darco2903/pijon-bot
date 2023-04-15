const { Command } = require("../../utils");
const { CommandInteraction, SlashCommandBuilder } = require("discord.js");

let data;
let execute;

data = new SlashCommandBuilder()
    .setName("msg")
    .setDescription("[Misc] Envoyer un message via Pijon Bot")
    .addStringOption((option) => option.setName("message").setDescription("Contenu du message").setRequired(true));

/** @param {CommandInteraction} interaction */
execute = async function (interaction) {
    const content = interaction.options.get("message");

    await interaction.deferReply();
    await interaction.deleteReply();
    await interaction.channel.send({ content: content.value });

    return Promise.resolve();
};

module.exports = new Command({ data, execute });
