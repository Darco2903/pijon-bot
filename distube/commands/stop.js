const { Command } = require("../../utils");
const { Interaction, SlashCommandBuilder } = require("discord.js");
const { DisTube } = require("distube");

let data;
let execute;

data = new SlashCommandBuilder().setName("stop").setDescription("[Music] Arrêter la lecture");

/** @param {Interaction} interaction */
execute = async function (interaction) {
    /** @type {DisTube} distube */
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);

    if (!queue) {
        await interaction.reply("Faut mettre une musique avant de faire ça");
        return;
    }

    await distube.stop(interaction);

    await interaction.reply(":stop_button:");
};

module.exports = new Command(data, execute);
