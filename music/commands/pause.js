const { ActivityType, SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("pause").setDescription("[Music] Mettre la lecture en pause"),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = await distube.getQueue(interaction);

        if (!queue) {
            interaction.reply("Faut mettre une musique avant de faire ça");
            return;
        }

        if (queue.paused) {
            interaction.reply("Déjà en pause");
            return;
        }

        distube.pause(interaction);

        interaction.reply(":pause_button:");

        const song = queue.songs[0];

        interaction.client.emit("music:setSongPresence", `[Pause] ${song.name}`);
    },
};
