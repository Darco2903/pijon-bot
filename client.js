const { Client, GatewayIntentBits, Partials } = require("discord.js");

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

const client = new Client({ intents, partials });

module.exports = {
    client,
};
