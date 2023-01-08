const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("stop").setDescription("[Music] Arrêter la lecture"),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = distube.getQueue(interaction);

        if (!queue) return interaction.reply("Faut mettre une musique avant de faire ça");

        distube.stop(interaction);

        interaction.reply(":stop_button:");
    },
};
