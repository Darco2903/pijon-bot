const { ActivityType, SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("pause").setDescription("[Music] Mettre la lecture en pause"),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = await distube.getQueue(interaction);

        if (!queue) {
            await interaction.reply("Faut mettre une musique avant de faire ça");
            return;
        }

        if (queue.paused) {
            await interaction.reply("Déjà en pause");
            return;
        }

        await distube.pause(interaction);

        await interaction.reply(":pause_button:");

        const song = queue.songs[0];

        interaction.client.emit("music:setSongPresence", `[Pause] ${song.name}`);
    },
};
