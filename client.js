const path = require("path");
const Utils = require("./Utils");
const { argv } = require("process");
const { token } = require("./config.json");
const getCommandFiles = require("./getCommandFiles");
const { Client, Collection, Events, GatewayIntentBits, Partials } = require("discord.js");

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
];

const partials = [Partials.Channel];

const client = new Client({ intents, partials });

client.Log = new Utils.Log(client, argv.slice(2));
client.Utils = Utils;

const commandFiles = getCommandFiles();
client.commands = new Collection();

commandFiles.forEach((file) => {
    const filePath = path.join(__dirname, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
    } else {
        client.Log.warn(`The command at ${filePath.replace(__dirname, ".")} is missing a required "data" or "execute" property.`);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    client.Log.command(interaction.user.username, interaction.commandName, interaction.options.data);

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
        client.Log.error(`No command matching ${color.yellow(interaction.commandName)} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        client.Log.error(`${interaction.commandName} failed:\n`, color.yellow(error));
        const reply = { content: "Une erreur est survenue lors de l'execution de cette commande.", ephemeral: true };
        try {
            await interaction.reply(reply);
        } catch (error) {
            try {
                await interaction.editReply(reply);
            } catch (error) {}
        }
    }
});

client.login(token);

module.exports = client;
