const { Command } = require("../../utils");
const { SlashCommandBuilder } = require("discord.js");

let data;
let execute;

data = new SlashCommandBuilder().setName("pause").setDescription("[Music] Mettre la lecture en pause");

execute = async function (interaction) {
    const distube = interaction.client.distube;
    const queue = await distube.getQueue(interaction);

    if (!queue) {
        await interaction.reply("Faut mettre une musique avant de faire ça");
        return;
    }

    if (queue.paused) {
        await interaction.reply("Déjà en pause");
        return;
    }

    await distube.pause(interaction);

    await interaction.reply(":pause_button:");

    const song = queue.songs[0];

    interaction.client.emit("presence:setSongPresence", `[Pause] ${song.name}`);
};

module.exports = new Command(data, execute);
