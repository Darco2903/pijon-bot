const { argv } = require("process");
const { Events } = require("discord.js");
const { client: config } = require("./config.json");

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
