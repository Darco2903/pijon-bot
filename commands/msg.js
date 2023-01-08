const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("msg")
        .setDescription("[Misc] Envoyer un message via Pijon Bot")
        .addStringOption((option) => option.setName("content").setDescription("Contenu du message").setRequired(true)),

    async execute(interaction) {
        const content = interaction.options.get("content");
        interaction.reply("Envoi...");
        interaction.deleteReply();
        interaction.channel.send({ content: content.value });
    },
};
