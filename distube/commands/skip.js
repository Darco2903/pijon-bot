const { Command } = require("../../utils");
const { CommandInteraction, SlashCommandBuilder } = require("discord.js");
const { Song } = require("../utils");
const CustomDistube = require("../CustomDistube");

let data;
let execute;

data = new SlashCommandBuilder().setName("skip").setDescription("[Music] Passer au morceau suivant");

/** @param {CommandInteraction} interaction */
execute = async function (interaction) {
    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);

    await interaction.deferReply();

    if (!queue) {
        await interaction.editReply("Aucune lecture en cours");
        return Promise.resolve();
    }

    if (!queue.songs[1] && !queue.autoplay) {
        await interaction.editReply(`Rien à suivre`);
        return Promise.resolve();
    }

    await queue.skip();

    if (queue.paused) {
        queue.resume();
    }

    let song = new Song.Song(queue.songs[1]);

    await interaction.editReply({
        embeds: [song.embed()],
    });

    return Promise.resolve();
};

module.exports = new Command({ data, execute });
