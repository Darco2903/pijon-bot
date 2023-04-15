const CustomClient = require("../../CustomClient");
const { Command } = require("../../utils");
const { CommandInteraction, SlashCommandBuilder } = require("discord.js");
const CustomOpenAI = require("../CustomOpenAI");

let data;
let execute;

data = new SlashCommandBuilder().setName("chatreset").setDescription("[ChatBot] Réinitialiser le chat");

/** @param {CommandInteraction} interaction */
execute = async function (interaction) {
    /** @type {CustomClient} */
    const client = interaction.client;
    /** @type {CustomOpenAI} */
    const openai = client.openai;
    if (openai.personnalChats.has(interaction.user.id)) {
        openai.personnalChats.get(interaction.user.id).reset();
    }

    await interaction.reply("Conversation réinitialisée");

    return Promise.resolve();
};

module.exports = new Command({ data, execute });
