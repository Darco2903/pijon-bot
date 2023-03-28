const { Command } = require("../../utils");
const { Interaction, SlashCommandBuilder } = require("discord.js");
const { DisTube } = require("distube");

let data;
let execute;

data = new SlashCommandBuilder().setName("skip").setDescription("[Music] Passer au morceau suivant");

/** @param {Interaction} interaction */
execute = async function (interaction) {
    /** @type {DisTube} */
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);

    if (!queue) {
        await interaction.reply("Faut mettre une musique avant de faire ça");
        return;
    }

    if (queue.songs.length < 2) {
        await interaction.reply(`Rien à suivre`);
        return;
    }

    await queue.skip();

    let nextSong = queue.songs[1];
    await interaction.reply(`:arrow_forward: Lecture de **${nextSong.name}**`);

    if (queue.paused) {
        distube.resume(interaction);
    }
};

module.exports = new Command(data, execute);
