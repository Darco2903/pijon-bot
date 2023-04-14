const { Command } = require("../../utils");
const { CommandInteraction, SlashCommandBuilder } = require("discord.js");
const filters = require("../utils/filters.json");
const CustomDistube = require("../CustomDistube");

let data;
let execute;

data = new SlashCommandBuilder()
    .setName("filter")
    .setDescription("[Music] Appliquer un filtre")
    .addStringOption((option) =>
        option
            .setName("filter")
            .setDescription("Choisir le filtre à appliquer")
            .setRequired(true)
            .addChoices(
                ...Object.entries(filters).map(([key, value]) => {
                    return { name: value, value: key };
                })
            )
    );
/** @param {CommandInteraction} interaction */
execute = async function (interaction) {
    /** @type {CustomDistube} */
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction);

    if (!queue) {
        await interaction.reply("Aucune lecture en cours");
        return;
    }

    const filter = interaction.options.get("filter");

    if (filter.value === "clear") {
        queue.filters.clear();
    } else {
        queue.filters.add(filter.value);
    }

    await interaction.reply(`Filtre appliqué **${filter.value}**`);
};

module.exports = new Command({ data, execute });
