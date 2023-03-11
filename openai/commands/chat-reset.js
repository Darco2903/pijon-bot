const Commande = require("../../Utils/Commande");
const { SlashCommandBuilder } = require("discord.js");

let data;
let execute;

data = new SlashCommandBuilder().setName("chatreset").setDescription("[ChatBot] Réinitialiser le chat");

execute = async function (interaction) {
    interaction.user.chat.reset();
    interaction.reply("Conversation réinitialisée");
};

module.exports = new Commande(data, execute);
