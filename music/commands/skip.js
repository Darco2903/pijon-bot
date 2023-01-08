const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("skip").setDescription("[Music] Passer au morceau suivant"),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = distube.getQueue(interaction);

        switch (true) {
            case !queue:
                interaction.reply("Faut mettre une musique avant de faire ça");
            //  Fall Through
            case queue.songs.length < 2:
                interaction.reply(`Rien à suivre`);
                return;

            default:
                break;
        }

        queue.skip();

        let nextSong = queue.songs[1];
        interaction.reply(`:arrow_forward: Lecture de **${nextSong.name}**`);
    },
};
