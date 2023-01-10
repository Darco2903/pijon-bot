const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("stop").setDescription("[Music] Arrêter la lecture"),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = await distube.getQueue(interaction);

        if (!queue) {
            await interaction.reply("Faut mettre une musique avant de faire ça");
            return;
        }

        await distube.stop(interaction);

        await interaction.reply(":stop_button:");
    },
};
