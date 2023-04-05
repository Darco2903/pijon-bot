const { Command } = require("../../utils");
const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { presence: presenceConfig } = require("../../config.json");

let data;
let execute;

data = new SlashCommandBuilder()
    .setName("set-presence")
    .setDescription("[Misc] Définir un preset de présence du bot")
    .addStringOption((option) =>
        option
            .setName("preset")
            .setDescription("Preset de présence")
            .setRequired(true)
            .addChoices(
                ...Object.entries(presenceConfig.preset).map(([key, { name }]) => {
                    return { name, value: key };
                })
            )
    );

execute = async function (interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        interaction.reply("T'as pas le droit eft");
        return;
    }
    const preset = interaction.options.get("preset");
    interaction.client.Presence.setPreset(preset.value);
    interaction.reply("Présence définie");
};

module.exports = new Command({ data, execute });
