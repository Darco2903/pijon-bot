const { Command } = require("../../utils");
const { Interaction, SlashCommandBuilder } = require("discord.js");
const { DisTube } = require("distube");

let data;
let execute;

data = new SlashCommandBuilder()
    .setName("seek")
    .setDescription("[Music] Déplacer la lecture vers un temps spécific")
    .addIntegerOption((option) => option.setName("hrs").setDescription("Hours").setMinValue(0))
    .addIntegerOption((option) => option.setName("min").setDescription("Minutes").setMinValue(0))
    .addIntegerOption((option) => option.setName("sec").setDescription("Seconds").setMinValue(0));

/** @param {Interaction} interaction */
execute = async function (interaction) {
    /** @type {DisTube} distube */
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);

    if (!queue) {
        await interaction.reply("Faut mettre une musique avant de faire ça");
        return;
    }

    let s = interaction.options.getInteger("sec") || 0;
    let m = interaction.options.getInteger("min") || 0;
    let h = interaction.options.getInteger("hrs") || 0;

    s = s < 0 ? 0 : s;
    m = m < 0 ? 0 : m;
    h = h < 0 ? 0 : h;

    const timeInSec = h * 3600 + m * 60 + s;

    const song = queue.songs[0];
    if (song.duration < timeInSec) {
        await interaction.reply(`La durée dépasse celle de la vidéo **${song.formattedDuration}**`);
        return;
    }

    queue.seek(timeInSec);

    if (s || m) {
        s = s.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false });
    }

    let formatedTime = `${s}s`;
    if (m || h) {
        m = m.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false });
        formatedTime = `${m}:` + formatedTime;
    }
    if (h) {
        formatedTime = `${h}:` + formatedTime;
    }

    await interaction.reply(`Reprise à **${formatedTime}**`);
};

module.exports = new Command(data, execute);
