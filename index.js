const { ActivityType, Client, Collection, Events, GatewayIntentBits, Partials, PresenceUpdateStatus } = require("discord.js");
const client = require("./client");
const Utils = require("./Utils");
const getCommandFiles = require("./getCommandFiles");
const { color } = require("console-log-colors");
const path = require("node:path");
const { argv } = require("node:process");

client.Log = new Utils.Log(client, argv.slice(2));
client.Utils = Utils;

client.commands = new Collection();
let commandFiles = getCommandFiles();
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

    // console.log(
    //     color.blue(interaction.user.username),
    //     color.cyan("/" + interaction.commandName),
    //     ...interaction.options.data.map((option) => `${color.blue(color.magenta(option.name))} ${color.yellow(option.value)}`)
    // );

    const a = interaction.options.data;

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

client.once(Events.ClientReady, () => {
    require("./music");
    require("./openai");
    client.Log.info(`Logged in as ${client.user.tag}`);
    client.Log.debug("Launched in debug mode");
    client.Log.verbose("Launched with verbose");
    initPresence();
});
