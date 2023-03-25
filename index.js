const { argv } = require("process");
// const { spawn } = require("child_process");
const { ActivityType, Events, PresenceUpdateStatus } = require("discord.js");
const { dependances } = require("./config.json");

const client = require("./client");

function startDependance(name) {
    if (name.includes("-")) {
        return;
    }
    if (!dependances.includes(name)) {
        client.Log.warn(`Unknow dependance ${name}`);
        return;
    }
    require(`./${name}`);
}

client.once(Events.ClientReady, () => {
    if (argv.includes("-all")) {
        dependances.forEach(startDependance);
    } else {
        argv.slice(2).forEach(startDependance);
    }
});
