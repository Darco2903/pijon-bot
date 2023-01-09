const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("filter")
        .setDescription("[Music] Appliquer un filtre")
        .addStringOption((option) =>
            option
                .setName("filter")
                .setDescription("Choose filter to apply")
                .setRequired(true)
                .addChoices({ name: "Clear", value: "clear" })
                .addChoices({ name: "3D", value: "3d" })
                .addChoices({ name: "BassBoost", value: "bassboost" })
                .addChoices({ name: "Echo", value: "echo" })
                .addChoices({ name: "Karaoke", value: "karaoke" })
                .addChoices({ name: "Nightcore", value: "nightcore" })
                .addChoices({ name: "Vaporwave", value: "vaporwave" })
                .addChoices({ name: "Flanger", value: "flanger" })
                .addChoices({ name: "Gate", value: "gate" })
                .addChoices({ name: "Haas", value: "haas" })
                .addChoices({ name: "Reverse", value: "reverse" })
                .addChoices({ name: "Surround", value: "surround" })
                .addChoices({ name: "Mcompand", value: "mcompand" })
                .addChoices({ name: "Phaser", value: "phaser" })
                .addChoices({ name: "Tremolo", value: "tremolo" })
                .addChoices({ name: "Earwax", value: "earwax" })
        ),

    async execute(interaction) {
        const distube = interaction.client.distube;
        const queue = distube.getQueue(interaction);

        if (!queue) {
            interaction.reply("Faut mettre une musique avant de faire ça");
            return;
        }

        const filter = interaction.options.get("filter").value;
        if (filter == "clear") queue.filters.clear();
        else queue.filters.add(filter);

        interaction.reply(`Filtre: ${filter}`);
    },
};
