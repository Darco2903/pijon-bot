const { Command } = require("../../utils");
const { CommandInteraction, SlashCommandBuilder } = require("discord.js");
const { Song } = require("../utils");
const CustomDistube = require("../CustomDistube");

let data;
let execute;

data = new SlashCommandBuilder()
    .setName("seek")
    .setDescription("[Music] Déplacer la lecture vers un temps spécific")
    .addIntegerOption((option) => option.setName("hrs").setDescription("Hours").setMinValue(0))
    .addIntegerOption((option) => option.setName("min").setDescription("Minutes").setMinValue(0))
    .addIntegerOption((option) => option.setName("sec").setDescription("Seconds").setMinValue(0));

/** @param {CommandInteraction} interaction */
execute = async function (interaction) {
    /** @type {CustomDistube} distube */
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);

    if (!queue) {
        await interaction.reply("Faut mettre une musique avant de faire ça");
        return Promise.resolve();
    }

    let s = interaction.options.getInteger("sec") ?? 0;
    let m = interaction.options.getInteger("min") ?? 0;
    let h = interaction.options.getInteger("hrs") ?? 0;

    const timeInSec = h * 3600 + m * 60 + s;

    const song = queue.songs[0];
    if (song.duration < timeInSec) {
        await interaction.reply(`La durée dépasse celle de la vidéo **${song.formattedDuration}**`);
        return Promise.resolve();
    }

    queue.seek(timeInSec);

    const formatedTime = Song.formatTime(timeInSec);
    await interaction.reply(`Reprise à **${formatedTime}**`);

    return Promise.resolve();
};

module.exports = new Command({ data, execute });
