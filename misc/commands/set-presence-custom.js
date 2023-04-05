const { Command, ActivitiesOptions } = require("../../utils");
const { SlashCommandBuilder, ActivityType, PresenceUpdateStatus, PermissionsBitField } = require("discord.js");

let data;
let execute;

data = new SlashCommandBuilder()
    .setName("set-presence-custom")
    .setDescription("[Misc] Définir la présence du bot")
    .addStringOption((option) =>
        option
            .setName("type")
            .setDescription("Type de présence")
            .setRequired(true)
            .addChoices(
                { name: "Joue à", value: ActivityType.Playing.toString() },
                { name: "Écoute", value: ActivityType.Listening.toString() },
                { name: "Regarde", value: ActivityType.Watching.toString() },
                { name: "Stream", value: ActivityType.Streaming.toString() }
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
    );

execute = async function (interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        interaction.reply("T'as pas le droit eft");
        return;
    }
    const message = interaction.options.get("message");
    const type = interaction.options.get("type");
    const status = interaction.options.get("status");
    interaction.client.Presence.set(new ActivitiesOptions({ name: message.value, type: type.value }), status.value);
    interaction.reply("Présence définie");
};

module.exports = new Command({ data, execute });
