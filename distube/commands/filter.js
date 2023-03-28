const { Command } = require("../../utils");
const { SlashCommandBuilder } = require("discord.js");
const filters = require("../utils/filters.json");

let data;
let execute;

data = new SlashCommandBuilder()
    .setName("filter")
    .setDescription("[Music] Appliquer un filtre")
    .addStringOption((option) =>
        option
            .setName("filter")
            .setDescription("Choose filter to apply")
            .setRequired(true)
            .addChoices(
                ...Object.entries(filters).map(([key, value]) => {
                    return { name: value, value: key };
                })
            )
    );

execute = async function (interaction) {
    const distube = interaction.client.distube;
    const queue = await distube.getQueue(interaction);

    if (!queue) {
        await interaction.reply("Faut mettre une musique avant de faire ça");
        return;
    }

    const filter = interaction.options.get("filter");
    if (filter.value === "clear") {
        queue.filters.clear();
    } else {
        queue.filters.add(filter.value);
    }
    await interaction.reply(`Filtre: ${filter.value}`);
};

module.exports = new Command(data, execute);
