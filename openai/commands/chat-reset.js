const { Command } = require("../../utils");
const { SlashCommandBuilder } = require("discord.js");

let data;
let execute;

data = new SlashCommandBuilder().setName("chatreset").setDescription("[ChatBot] Réinitialiser le chat");

execute = async function (interaction) {
    if (interaction.user.chat) {
        interaction.user.chat.reset();
    }
    interaction.reply("Conversation réinitialisée");
};

module.exports = new Command({ data, execute });
