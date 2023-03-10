const { ActivityType, SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("resume").setDescription("[Music] Reprendre la lecture"),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = await distube.getQueue(interaction);

        if (!queue) {
            await interaction.reply("Faut mettre une musique avant de faire ça");
            return;
        }

        if (!queue.paused) {
            await interaction.reply("Déjà en lecture");
            return;
        }

        await distube.resume(interaction);

        await interaction.reply(":arrow_forward:");

        const song = queue.songs[0];
        interaction.client.emit("music:setSongPresence", song.name);
    },
};
