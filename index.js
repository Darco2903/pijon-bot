const path = require("node:path");
const { ActivityType, Client, Collection, Events, GatewayIntentBits, Status, PresenceUpdateStatus } = require("discord.js");
const { token } = require("./config.json");
const getCommandFiles = require("./getCommandFiles");
const { color } = require("console-log-colors");

const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates];
const client = new Client({ intents });
global.client = client;
client.commands = new Collection();

let commandFiles = getCommandFiles();
commandFiles.forEach((file) => {
    const filePath = path.join(__dirname, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(color.yellow(`[WARNING] The command at ${filePath.replace(__dirname, ".")} is missing a required "data" or "execute" property.`));
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    
    if (!command) {
        console.error(color.red(`No command matching ${interaction.commandName} was found.`));
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(color.red(`${interaction.commandName} failed:\n ${error}`));
        await interaction.reply({ content: "Une erreur est survenue lors de l'execution de cette commande.", ephemeral: true });
    }
});

function setDefaultPresence() {
    client.user.setPresence({
        activities: [{ name: "J'suis un sniper", type: ActivityType.Listening, url: "https://youtu.be/RyiDL-dVsIs" }],
        status: "online",
    });
}

client.once(Events.ClientReady, (c) => {
    require("./music/main");
    setDefaultPresence();
    console.log(color.green(`Logged in as ${c.user.tag}`));
});

client.on("presence:setDefault", setDefaultPresence);

client.login(token);
