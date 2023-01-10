const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("image-generator")
        .setDescription("[image-creation] Generation d'image")
        .addStringOption((option) => option.setName("prompt").setDescription("phrase decrivant l'image").setRequired(true)),

    async execute(interaction) {
        interaction.deferReply();

        const prompt = interaction.options.get("prompt").value;
        const res = await interaction.client.openai.createImage({
            prompt,
            n: 1,
            size: "1024x1024",
        });

        if (res.data.data.length == 0) {
            interaction.editReply("Err");
            return;
        }
        let image = new EmbedBuilder().setImage(res.data.data[0].url);
        interaction.editReply({ content: `Voici à quoi me fait penser ${prompt}:`, embeds: [image] });
    },
};
