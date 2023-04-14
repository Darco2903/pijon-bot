const { Command } = require("../../utils");
const { CommandInteraction, SlashCommandBuilder } = require("discord.js");
const CustomDistube = require("../CustomDistube");

let data;
let execute;

data = new SlashCommandBuilder().setName("resume").setDescription("[Music] Reprendre la lecture");

/** @param {CommandInteraction} interaction */
execute = async function (interaction) {
    /** @type {CustomDistube} distube */
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);

    if (!queue) {
        await interaction.reply("Faut mettre une musique avant de faire ça");
        return;
    }

    if (!queue.paused) {
        await interaction.reply("Déjà en lecture");
        return;
    }

    distube.resume(interaction);

    await interaction.reply(":arrow_forward:");

    const song = queue.songs[0];
    distube.setSongPresence(song.name);

    return Promise.resolve();
};

module.exports = new Command({ data, execute });
