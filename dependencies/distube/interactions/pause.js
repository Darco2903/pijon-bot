const { SlashCommandBuilder } = require("discord.js");

const { distube } = require("../distube");
const { setSongPresence } = require("../utils/song");

module.exports = {
    data: new SlashCommandBuilder().setName("pause").setDescription("[Music] Mettre en pause"),

    /** @param {import("discord.js").CommandInteraction} interaction */
    async execute(interaction) {
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
        setSongPresence(`[Pause] ${song.name}`);
    },
};
