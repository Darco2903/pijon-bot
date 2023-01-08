const { ActivityType, SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("resume").setDescription("[Music] Reprendre la lecture"),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = distube.getQueue(interaction);

        switch (true) {
            case !queue:
                interaction.reply("Faut mettre une musique avant de faire ça");
            //  Fall Through
            case !queue.paused:
                interaction.reply("Déjà en lecture");
                return;

            default:
                break;
        }

        distube.resume(interaction);

        interaction.reply(":arrow_forward:");

        const song = queue.songs[0];

        interaction.client.user.setPresence({
            activities: [{ name: song.name, type: ActivityType.Listening, url: song.url }],
            status: "online",
        });
    },
};
