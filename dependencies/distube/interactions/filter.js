const { SlashCommandBuilder } = require("discord.js");

const { distube } = require("../distube");

const filters = require("../utils/filters.json");

module.exports = {
    data: new SlashCommandBuilder()
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
        ),

    /** @param {import("discord.js").CommandInteraction} interaction */
    async execute(interaction) {
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
    },
};
