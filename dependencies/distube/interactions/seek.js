const { SlashCommandBuilder } = require("discord.js");

const { distube } = require("../distube");

function formattedDuration(duration) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);
    let formattedDuration = "";
    if (hours > 0) formattedDuration += `${hours}:`;
    if (minutes < 10 && hours > 0) formattedDuration += `0`;
    formattedDuration += `${minutes}:`;
    if (seconds < 10) formattedDuration += `0`;
    formattedDuration += `${seconds}`;
    return formattedDuration;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("seek")
        .setDescription("[Music] Déplacer la lecture vers un temps spécific")
        .addIntegerOption((option) => option.setName("hrs").setDescription("Hours").setMinValue(0))
        .addIntegerOption((option) => option.setName("min").setDescription("Minutes").setMinValue(0))
        .addIntegerOption((option) => option.setName("sec").setDescription("Seconds").setMinValue(0)),

    /** @param {import("discord.js").CommandInteraction} interaction */
    async execute(interaction) {
        const queue = distube.getQueue(interaction);

        if (!queue) {
            await interaction.reply("Faut mettre une musique avant de faire ça");
            return;
        }

        const s = interaction.options.getInteger("sec") ?? 0;
        const m = interaction.options.getInteger("min") ?? 0;
        const h = interaction.options.getInteger("hrs") ?? 0;
        const timeInSec = h * 3600 + m * 60 + s;

        const song = queue.songs[0];
        if (song.duration < timeInSec) {
            await interaction.reply(`La durée dépasse celle de la vidéo **${song.formattedDuration}**`);
            return;
        }

        queue.seek(timeInSec);

        const formatedTime = formattedDuration(timeInSec);
        await interaction.reply(`Reprise à **${formatedTime}**`);
    },
};
