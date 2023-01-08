const { ActivityType, SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("pause").setDescription("[Music] Mettre la lecture en pause"),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = distube.getQueue(interaction);

        switch (true) {
            case !queue:
                interaction.reply("Faut mettre une musique avant de faire ça");
            //  Fall Through
            case queue.paused:
                interaction.reply("Déjà en pause");
                return;

            default:
                break;
        }

        distube.pause(interaction);

        interaction.reply(":pause_button:");

        const song = queue.songs[0];

        interaction.client.user.setPresence({
            activities: [{ name: `En pause ${song.name}`, type: ActivityType.Listening, url: song.url }],
            status: "online",
        });
    },
};
