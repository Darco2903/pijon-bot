const { SlashCommandBuilder } = require("discord.js");

const { distube } = require("../distube");

module.exports = {
    data: new SlashCommandBuilder().setName("stop").setDescription("[Music] Arrêter la lecture"),

    /** @param {import("discord.js").CommandInteraction} interaction */
    async execute(interaction) {
        const queue = distube.getQueue(interaction);

        if (!queue) {
            await interaction.reply("Faut mettre une musique avant de faire ça");
            return;
        }

        await interaction.deferReply();
        await distube.stop(interaction);
        await interaction.editReply(":stop_button:");
    },
};
