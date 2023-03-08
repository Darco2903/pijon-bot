const path = require("node:path");
const { ActivityType, Client, Collection, Events, GatewayIntentBits, Partials, PresenceUpdateStatus } = require("discord.js");
const { token } = require("./config.json");
const getCommandFiles = require("./getCommandFiles");
const { color } = require("console-log-colors");
const { argv } = require("node:process");
const URL = require("url");

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
];

const partials = [Partials.Channel];

const client = new Client({ intents, partials });
global.client = client;
client.commands = new Collection();

client.logWarn = (message) => console.warn(color.yellow(`[WARNING] ${message}`));
client.logErr = (message) => console.error(color.red(`[ERROR] ${message}`));
client.logDebug = (message) => {
    if (client.debug) console.debug(color.blueBright(`[DEBUG] ${message}`));
};

let commandFiles = getCommandFiles();
commandFiles.forEach((file) => {
    const filePath = path.join(__dirname, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
    } else {
        client.logWarn(`The command at ${filePath.replace(__dirname, ".")} is missing a required "data" or "execute" property.`);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    console.log(
        color.blue(interaction.user.username),
        color.cyan("/" + interaction.commandName),
        ...interaction.options.data.map((option) => `${color.blue(color.magenta(option.name))} ${color.yellow(option.value)}`)
    );

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
        client.logErr(`No command matching ${color.yellow(interaction.commandName)} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        client.logErr(`${interaction.commandName} failed:\n`, color.yellow(error));
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

/**
 *
 * @param {String} name
 * @param {ActivityType} type
 * @param {PresenceUpdateStatus} status
 * @param {URL} [url]
 */
function setPresence(name, type, status, url) {
    client.user.setPresence({
        activities: [{ name, type, url }],
        status,
    });
}

function setDefaultPresence() {
    setPresence("J'suis un sniper", ActivityType.Listening, PresenceUpdateStatus.Online, "https://youtu.be/RyiDL-dVsIs");
}

function initPresence() {
    switch (argv[2]) {
        case "DEBUG":
            setPresence("dev", ActivityType.Playing, PresenceUpdateStatus.DoNotDisturb);
            break;

        case "TEST":
            setPresence("en test", ActivityType.Playing, PresenceUpdateStatus.Idle);
            break;

        default:
            setDefaultPresence();
            break;
    }
}

client.on("presence:setDefault", setDefaultPresence);

client.once(Events.ClientReady, (c) => {
    client.debug = argv[2] === "DEBUG";
    client.logDebug("Client launched in debug mode");
    require("./music/main");
    require("./openai/main");
    console.log(color.green(`Logged in as ${c.user.tag}`));
    initPresence();
});

client.login(token);
