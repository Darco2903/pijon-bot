const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("previous").setDescription("[Music] Revenir au morceau précédent"),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = distube.getQueue(interaction);

        switch (true) {
            case !queue:
                interaction.reply("Faut mettre une musique avant de faire ça");
            //  Fall Through
            case !queue.previousSongs[0]:
                interaction.reply("Pas de musique précédente");
                return;

            default:
                break;
        }

        queue.previous();

        //  if (queue.paused) distube.resume(interaction);

        let n = queue.previousSongs.length - 1;
        let prevSong = queue.previousSongs[n];

        interaction.reply(`:arrow_forward: Lecture de **${prevSong.name}**`);
    },
};
