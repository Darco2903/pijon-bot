const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("pause").setDescription("[Music] Mettre en pause"),

    /** @param {import("discord.js").CommandInteraction} interaction */
    async execute(interaction) {
        //
    },
};
