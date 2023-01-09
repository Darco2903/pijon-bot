const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("previous").setDescription("[Music] Revenir au morceau précédent"),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = distube.getQueue(interaction);

        if (!queue) {
            interaction.reply("Faut mettre une musique avant de faire ça");
            return;
        }

        if (!queue.previousSongs[0]) {
            interaction.reply("Pas de musique précédente");
            return;
        }

        queue.previous();

        if (queue.paused) distube.resume(interaction);

        let n = queue.previousSongs.length - 1;
        let prevSong = queue.previousSongs[n];

        interaction.reply(`:arrow_forward: Lecture de **${prevSong.name}**`);
    },
};
