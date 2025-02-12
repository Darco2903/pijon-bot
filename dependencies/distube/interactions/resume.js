const { SlashCommandBuilder } = require("discord.js");

const { distube } = require("../distube");
const { setSongPresence } = require("../utils/song");

module.exports = {
    data: new SlashCommandBuilder().setName("resume").setDescription("[Music] Reprendre la lecture"),

    /** @param {import("discord.js").CommandInteraction} interaction */
    async execute(interaction) {
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
        setSongPresence(song.name);
    },
};
