const { Command } = require("../../utils");
const { Interaction, SlashCommandBuilder } = require("discord.js");
const { DisTube } = require("distube");

let data;
let execute;

data = new SlashCommandBuilder().setName("pause").setDescription("[Music] Mettre la lecture en pause");

/** @param {Interaction} interaction */
execute = async function (interaction) {
    /** @type {DisTube} distube */
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);

    if (!queue) {
        await interaction.reply("Faut mettre une musique avant de faire ça");
        return;
    }

    if (queue.paused) {
        await interaction.reply("Déjà en pause");
        return;
    }

    distube.pause(interaction);

    await interaction.reply(":pause_button:");

    const song = queue.songs[0];
    distube.setSongPresence(`[Pause] ${song.name}`);
};

module.exports = new Command({ data, execute });
