const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("reset").setDescription("[ChatBot] Réinitialiser le chat"),
    async execute(interaction) {
        interaction.user.conv = null;
        interaction.reply("Conversation réinitialisée");
    },
};
