const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tts")
        .setDescription("[Misc] Ennocer un message via Pijon Bot")
        .addStringOption((option) => option.setName("message").setDescription("Contenu du message").setRequired(true)),

    async execute(interaction) {
        const content = interaction.options.get("message");
        await interaction.deferReply();
        interaction.deleteReply();
        interaction.channel.send({ content: content.value, tts: true });
    },
};
