const path = require("node:path");
const { ActivityType, Client, Collection, Events, GatewayIntentBits, Partials, PresenceUpdateStatus } = require("discord.js");
const { token } = require("./config.json");
const Utils = require("./Utils");
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
client.debug = argv[2] === "DEBUG";
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

function setDefaultPresence() {
    client.user.setPresence({
        activities: new Utils.ActivitiesOptions({
            name: "J'suis un sniper",
            type: ActivityType.Listening,
            url: "https://youtu.be/RyiDL-dVsIs",
        }),
        status: PresenceUpdateStatus.Online,
    });
}

function initPresence() {
    switch (argv[2]) {
        case "DEBUG":
            client.user.setPresence({
                activities: new Utils.ActivitiesOptions({
                    name: "dev",
                    type: ActivityType.Playing,
                }),
                status: PresenceUpdateStatus.DoNotDisturb,
            });
            break;

        case "TEST":
            client.user.setPresence({
                activities: new Utils.ActivitiesOptions({
                    name: "en test",
                    type: ActivityType.Playing,
                }),
                status: PresenceUpdateStatus.Idle,
            });
            break;

        default:
            setDefaultPresence();
            break;
    }
}

client.on("presence:setDefault", setDefaultPresence);

client.once(Events.ClientReady, (c) => {
    require("./music");
    require("./openai");
    client.logDebug("Launched in debug mode");
    console.log(color.green(`Logged in as ${c.user.tag}`));
    initPresence();
});

client.login(token);
