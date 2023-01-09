const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("skip").setDescription("[Music] Passer au morceau suivant"),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = distube.getQueue(interaction);

        if (!queue) {
            interaction.reply("Faut mettre une musique avant de faire ça");
            return;
        }

        if (queue.songs.length < 2) {
            interaction.reply(`Rien à suivre`);
            return;
        }

        queue.skip();

        if (queue.paused) distube.resume(interaction);

        let nextSong = queue.songs[1];
        interaction.reply(`:arrow_forward: Lecture de **${nextSong.name}**`);
    },
};
