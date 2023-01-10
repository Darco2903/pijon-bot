const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("previous").setDescription("[Music] Revenir au morceau précédent"),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = await distube.getQueue(interaction);

        if (!queue) {
            await interaction.reply("Faut mettre une musique avant de faire ça");
            return;
        }

        if (!queue.previousSongs[0]) {
            await interaction.reply("Pas de musique précédente");
            return;
        }

        await queue.previous();

        let n = queue.previousSongs.length - 1;
        let prevSong = queue.previousSongs[n];

        await interaction.reply(`:arrow_forward: Lecture de **${prevSong.name}**`);

        if (queue.paused) await distube.resume(interaction);
    },
};
