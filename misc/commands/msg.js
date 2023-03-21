const Command = require("../../Utils/Command");
const { SlashCommandBuilder } = require("discord.js");

let data;
let execute;

data = new SlashCommandBuilder()
    .setName("msg")
    .setDescription("[Misc] Envoyer un message via Pijon Bot")
    .addStringOption((option) => option.setName("message").setDescription("Contenu du message").setRequired(true));

execute = async function (interaction) {
    const content = interaction.options.get("message");
    await interaction.deferReply();
    interaction.deleteReply();
    interaction.channel.send({ content: content.value });
};

module.exports = new Command(data, execute);
