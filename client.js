const { argv } = require("process");
const { Events, GatewayIntentBits, Partials, Client } = require("discord.js");
// const db = require("./database");
// const Utils = require("./utils");
const CustomClient = require("./CustomClient");

const { client: clientConfig } = require("./config.json");
const { token } = clientConfig;

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
];
const partials = [Partials.Channel];
const startOptions = argv.slice(2);

// const client = new Client({ intents, partials });
const client = new CustomClient({ intents, partials }, startOptions);
client.login(token);

// client.db = db;
// client.db.connect();

// client.test = startOptions.includes("-TEST");
// client.debug = startOptions.includes("-DEBUG");
// client.dependencies = startOptions.includes("-all") ? clientConfig.dependances : startOptions.filter((option) => !option.startsWith("-"));
// client.Logger = new Utils.Log(client.debug);
// client.CommandRegister = new Utils.CommandRegister(token);
// client.ConsoleHandler = new ConsoleHandler(client);
// client.Presence = new Utils.Presence(client);

// client.Logger.debug("Client initialization");

async function chatCommand(interaction) {
    client.Logger.command(interaction.user.username, interaction.commandName, interaction.options.data);
    const command = interaction.client.commands.get(interaction.commandName);

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
}

async function autocomplete(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);
    try {
        const completion = await command.autocomplete(interaction);
        await interaction.respond(completion);
    } catch (error) {
        client.Logger.error("autocomplete", error);
    }
}

client.on(Events.InteractionCreate, async (interaction) => {
    // console.log("isAnySelectMenu:", interaction.isAnySelectMenu());
    // console.log("isAutocomplete:", interaction.isAutocomplete());
    // console.log("isButton:", interaction.isButton());
    // console.log("isChannelSelectMenu:", interaction.isChannelSelectMenu());
    // console.log("isChatInputCommand:", interaction.isChatInputCommand());
    // console.log("isCommand:", interaction.isCommand());
    // console.log("isContextMenuCommand:", interaction.isContextMenuCommand());
    // console.log("isMentionableSelectMenu:", interaction.isMentionableSelectMenu());
    // console.log("isMessageComponent:", interaction.isMessageComponent());
    // console.log("isMessageContextMenuCommand:", interaction.isMessageContextMenuCommand());
    // console.log("isModalSubmit:", interaction.isModalSubmit());
    // console.log("isRepliable:", interaction.isRepliable());
    // console.log("isRoleSelectMenu:", interaction.isRoleSelectMenu());
    // console.log("isStringSelectMenu:", interaction.isStringSelectMenu());
    // console.log("isUserContextMenuCommand:", interaction.isUserContextMenuCommand());
    // console.log("isUserSelectMenu:", interaction.isUserSelectMenu());
    // console.log("\n");

    switch (true) {
        case interaction.isAutocomplete():
            autocomplete(interaction);
            break;
        case interaction.isChatInputCommand():
            chatCommand(interaction);
            break;

        default:
            break;
    }
});

module.exports = client;
