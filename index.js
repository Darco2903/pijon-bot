const { Events } = require("discord.js");
const client = require("./client");

const { client: clientConfig } = require("./config.json");
const { dependances } = clientConfig;

function startDependance(name) {
    if (!dependances.includes(name)) {
        client.Logger.warn(`Unknow dependance ${name}`);
        return;
    }
    try {
        client.Logger.info(`Starting ${name}`);
        require(`./${name}`);
        client.Logger.info(`${name} started successfully`);
    } catch (error) {
        client.Logger.error(`Failed to start ${name}`, error);
    }
}

client.once(Events.ClientReady, async () => {
    client.Logger.info(`Logged in as ${client.user.tag}`);
    client.Logger.debug("Launched in debug mode");
    client.Presence.setRandom();
    client.dependencies.forEach(startDependance);
});
