const { ActivityType, SlashCommandBuilder } = require("discord.js");
const { restart } = require("../main");

module.exports = {
    // data: new SlashCommandBuilder().setName("restart").setDescription("[Dev] Redémarrer"),

    async execute(interaction) {
        restart(interaction);
    },
};
