const path = require("path");
const Utils = require("./Utils");
const { argv } = require("process");
const { token } = require("./config.json");
// const getCommandFiles = require("./getCommandFiles");
const { Client, Collection, Events, GatewayIntentBits, Partials, SlashCommandBuilder, CommandInteraction } = require("discord.js");
const Commande = require("./Utils/Commande");

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
];

const partials = [Partials.Channel];

const client = new Client({ intents, partials });

const logOptions = argv.slice(2);
client.Log = new Utils.Log(logOptions);
client.Utils = Utils;
client.Log.debug("Client initialization");
client.Log.verbose("Client initialization");
client.Log.verbose(`logOptions: ${logOptions}`);

client.commands = new Collection();

// const commandFiles = getCommandFiles();
// client.Log.verbose(`commandFiles: ${commandFiles.toString()}`);
// commandFiles.forEach((file) => {
//     client.Log.verbose(`commandFiles.forEach [${file}] -> file: ${file}`);
//     const filePath = path.join(__dirname, file);
//     client.Log.verbose(`commandFiles.forEach [${file}] -> filePath: ${filePath}`);
//     /**
//      * @type {Commande}
//      */
//     const command = require(filePath);
//     client.Log.verbose(`commandFiles.forEach [${file}] -> command: ${command.toString()}`);

//     client.Log.debug(`${file} command valid: ${command.valid}`);
//     if (command.valid) {
//         // Set a new item in the Collection with the key as the command name and the value as the exported module
//         client.commands.set(command.data.name, command);
//         client.Log.verbose(`commandFiles -> [${file}] -> client.commands.set(): ${command.data.name} ${command}`);
//     } else {
//         client.Log.warn(`Command at ${filePath.replace(__dirname, ".")}  not valid.`);
//     }
// });

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

client.login(token);

client.on("ready", () => {
    client.Log.debug("Logged with token");
    client.Log.debug("Client initialized");
    client.Log.verbose("Logged with token");
    client.Log.verbose("Client initialized");
});

module.exports = client;
