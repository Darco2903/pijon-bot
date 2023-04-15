const { Command } = require("../../utils");
const { CommandInteraction, SlashCommandBuilder } = require("discord.js");
const CustomClient = require("../../CustomClient");

let data;
let execute;

data = new SlashCommandBuilder().setName("stop").setDescription("[Music] Arrêter la lecture");

/** @param {CommandInteraction} interaction */
execute = async function (interaction) {
    /** @type {CustomClient} distube */
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);

    if (!queue) {
        await interaction.reply("Faut mettre une musique avant de faire ça");
        return;
    }

    await distube.stop(interaction);
    await interaction.reply(":stop_button:");

    return Promise.resolve();
};

module.exports = new Command({ data, execute });
