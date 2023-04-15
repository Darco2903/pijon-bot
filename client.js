const { argv } = require("process");
const { Events, GatewayIntentBits, Partials } = require("discord.js");
const CustomClient = require("./CustomClient");
const { Command } = require("./utils");

const {
    client: { token },
} = require("./config.json");

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildScheduledEvents,
];
const partials = [Partials.Channel];
const startOptions = argv.slice(2);

const client = new CustomClient({ intents, partials }, startOptions);
client.login(token);

client.on(Events.InteractionCreate, async (interaction) => {
    let command;

    switch (true) {
        case interaction.isChatInputCommand():
            client.Logger.command(interaction.user.username, interaction.commandName, interaction.options.data);
            /** @type {Command} */
            command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                const reply = { content: `Aucune commande ${interaction.commandName} trouvé.`, ephemeral: true };
                client.Logger.warn(`No command matching ${interaction.commandName} was found.`);
                await interaction.reply(reply);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                const reply = { content: "Une erreur est survenue lors de l'execution de cette commande.", ephemeral: true };
                client.Logger.commandError(interaction.commandName, interaction.options.data, error);
                try {
                    await interaction.reply(reply);
                } catch (error) {
                    try {
                        await interaction.editReply(reply);
                    } catch (error) {}
                }
            }
            break;

        case interaction.isAutocomplete():
            command = interaction.client.commands.get(interaction.commandName);
            try {
                const completion = await command.autocomplete(interaction);
                await interaction.respond(completion);
            } catch (error) {
                client.Logger.error("autocomplete", error);
            }
            break;
    }
});

module.exports = client;
