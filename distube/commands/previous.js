const { Command } = require("../../utils");
const { Interaction, SlashCommandBuilder } = require("discord.js");
const { DisTube } = require("distube");
const { Song } = require("../utils");

let data;
let execute;

data = new SlashCommandBuilder().setName("previous").setDescription("[Music] Revenir au morceau précédent");

/** @param {Interaction} interaction */
execute = async function (interaction) {
    /** @type {DisTube} */
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

    let n = queue.previousSongs.length - 1;
    let song = new Song.Song(queue.previousSongs[n]);

    await interaction.editReply({
        embeds: [song.embed()],
    });
};

module.exports = new Command({ data, execute });
