const { Command, ActivitiesOptions } = require("../../utils");
const { ActivityType, AutocompleteInteraction, CommandInteraction, PresenceUpdateStatus, PermissionsBitField, SlashCommandBuilder } = require("discord.js");
const CustomClient = require("../../CustomClient");

const {
    presence: { preset: presencePresets },
} = require("../../config.json");

let data;
let execute;
let autocomplete;

data = new SlashCommandBuilder()
    .setName("presence")
    .setDescription("[Misc] Définir la présence du bot")
    .addSubcommandGroup((group) =>
        group
            .setName("set")
            .setDescription("[Misc] Définir la présence du bot")
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("custom")
                    .setDescription("[Misc] Définir une présence personnalisée")
                    .addStringOption((option) =>
                        option
                            .setName("type")
                            .setDescription("Type de présence")
                            .setRequired(true)
                            .addChoices(
                                { name: "Joue à", value: ActivityType.Playing.toString() },
                                { name: "Écoute", value: ActivityType.Listening.toString() },
                                { name: "Regarde", value: ActivityType.Watching.toString() },
                                { name: "Stream", value: ActivityType.Streaming.toString() },
                                { name: "Participe à ", value: ActivityType.Competing.toString() }
                            )
                    )
                    .addStringOption((option) => option.setName("message").setDescription("Message de présence").setRequired(true))
                    .addStringOption((option) =>
                        option
                            .setName("status")
                            .setDescription("Statut du bot")
                            .setRequired(true)
                            .addChoices(
                                { name: "En ligne", value: PresenceUpdateStatus.Online.toString() },
                                { name: "Ne pas déranger", value: PresenceUpdateStatus.DoNotDisturb.toString() },
                                { name: "Inactif", value: PresenceUpdateStatus.Idle.toString() },
                                { name: "Invisible", value: PresenceUpdateStatus.Offline.toString() }
                            )
                    )
            )
            .addSubcommand((subcommand) =>
                subcommand
                    .setName("preset")
                    .setDescription("[Misc] Définir un preset de présence")
                    .addStringOption((option) => option.setName("preset").setDescription("Preset de présence").setRequired(true).setAutocomplete(true))
            )
    );

/** @param {CommandInteraction} interaction */
execute = async function (interaction) {
    /** @type {CustomClient} */
    const client = interaction.client;

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        interaction.reply("T'as pas le droit eft");
        return;
    }

    switch (interaction.options.getSubcommand()) {
        case "custom":
            const message = interaction.options.getString("message");
            const type = interaction.options.getString("type");
            const status = interaction.options.getString("status");
            client.Presence.set(new ActivitiesOptions({ name: message, type: type }), status);
            break;

        case "preset":
            const preset = interaction.options.getString("preset");
            client.Presence.setPreset(preset);
            break;
    }

    await interaction.reply("Présence définie");

    return Promise.resolve();
};

/** @param {AutocompleteInteraction} interaction */
autocomplete = async function (interaction) {
    const preset = interaction.options.getString("preset");
    let choices = [];

    if (interaction.options.getSubcommand() === "preset") {
        choices = Object.entries(presencePresets)
            .map(([key, value]) => ({ name: value.name, value: key }))
            .filter(({ name }) => name.toLowerCase().includes(preset.toLowerCase()));
    }

    return Promise.resolve(choices);
};

module.exports = new Command({ data, execute, autocomplete });
