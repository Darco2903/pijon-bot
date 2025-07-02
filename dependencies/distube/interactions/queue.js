const { SlashCommandBuilder } = require("discord.js");

const { distube } = require("../distube");
const { formatSong, getSongEmbed } = require("../utils/song");

module.exports = {
    data: new SlashCommandBuilder().setName("queue").setDescription("[Music] Affiche la file d'attente de musique"),
    /** @param {import("discord.js").CommandInteraction} interaction */
    async execute(interaction) {
        //
    },

    /** @param {import("discord.js").AutocompleteInteraction} interaction */
    async autocomplete(interaction) {
        //
    },
};
