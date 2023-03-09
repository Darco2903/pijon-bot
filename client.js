const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { token } = require("./config.json");

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
];

const partials = [Partials.Channel];

const client = new Client({ intents, partials });
client.login(token);

module.exports = client;
