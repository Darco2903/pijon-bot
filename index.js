const { argv } = require("process");
const { Events } = require("discord.js");
const { client: clientConfig } = require("./config.json");
const { dependances } = clientConfig;

const client = require("./client");

function startDependance(name) {
    if (name.includes("-")) {
        return;
    }
    if (!config.dependances.includes(name)) {
        client.Log.warn(`Unknow dependance ${name}`);
        return;
    }
    require(`./${name}`);
}

client.once(Events.ClientReady, () => {
    if (argv.includes("-all")) {
        config.dependances.forEach(startDependance);
    } else {
        argv.slice(2).forEach(startDependance);
    }
});
