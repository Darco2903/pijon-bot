const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("chatreset").setDescription("[ChatBot] Réinitialiser le chat"),
    async execute(interaction) {
        interaction.user.chat.reset();
        interaction.reply("Conversation réinitialisée");
    },
};
