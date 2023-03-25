const { argv } = require("process");
const { Client, Events, GatewayIntentBits, Partials } = require("discord.js");
const { token } = require("./config.json");
const utils = require("./utils");

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
];

const partials = [Partials.Channel];

const client = new Client({ intents, partials });

const clientStartOptions = argv.slice(2);
client.test = clientStartOptions.includes("-TEST");
client.debug = clientStartOptions.includes("-DEBUG");
client.verbose = clientStartOptions.includes("-VERBOSE");
client.Log = new utils.Log(client);
client.CommandRegister = new utils.CommandRegister(client);
// client.Console = new utils.ConsoleHandler();
client.Presence = new utils.Presence(client);

client.utils = utils;
client.Log.debug("Client initialization");
client.Log.verbose("Client initialization");
client.Log.verbose(`clientStartOptions: ${clientStartOptions}`);

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    client.Log.verbose(`- onInteractionCreate [${interaction.user.username} | ${interaction.commandName}]`);
    client.Log.command(interaction.user.username, interaction.commandName, interaction.options.data);
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        const reply = { content: `Aucune commande ${interaction.commandName} trouvé.`, ephemeral: true };
        client.Log.warn(`No command matching ${interaction.commandName} was found.`);
        client.Log.verbose(`onInteractionCreate [${interaction.user.username} | ${interaction.commandName}] -> reply: ${reply}`);
        await interaction.reply(reply);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        const reply = { content: "Une erreur est survenue lors de l'execution de cette commande.", ephemeral: true };
        client.Log.verbose(`onInteractionCreate [${interaction.user.username} | ${interaction.commandName}] (ERROR) -> reply: ${reply}`);
        client.Log.commandError(interaction.commandName, interaction.options.data, error);
        try {
            await interaction.reply(reply);
        } catch (error) {
            try {
                await interaction.editReply(reply);
            } catch (error) {}
        }
    }
});

client.on(Events.ClientReady, () => {
    client.Log.info(`Logged in as ${client.user.tag}`);
    client.Log.debug("Launched in debug mode");
    client.Log.verbose("Launched with verbose");
    client.Presence.setRandom();
});

client.login(token);

module.exports = client;
