const { Command } = require("../../utils");
const { CommandInteraction, SlashCommandBuilder } = require("discord.js");
const CustomDistube = require("../CustomDistube");
const { Song } = require("../utils");

let data;
let execute;

data = new SlashCommandBuilder().setName("previous").setDescription("[Music] Revenir au morceau précédent");

/** @param {CommandInteraction} interaction */
execute = async function (interaction) {
    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);

    await interaction.deferReply();

    if (!queue) {
        await interaction.editReply("Aucune lecture en cours");
        return;
    }

    if (!queue.previousSongs[0]) {
        await interaction.editReply("Pas de musique précédente");
        return;
    }

    await queue.previous();

    if (queue.paused) {
        queue.resume();
    }

    const n = queue.previousSongs.length - 1;
    const song = new Song.Song(queue.previousSongs[n]);

    await interaction.editReply({
        embeds: [song.embed()],
    });
};

module.exports = new Command({ data, execute });
