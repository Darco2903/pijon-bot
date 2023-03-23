const path = require("path");
const { argv } = require("process");
// const { spawn } = require("child_process");
const { ActivityType, Events, PresenceUpdateStatus } = require("discord.js");
const { dependances } = require("./config.json");

const client = require("./client");
const Utils = require("./Utils");

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

client.on("presence:setDefault", setDefaultPresence);
client.once(Events.ClientReady, () => {
    initPresence();

    if (argv.includes("-all")) {
        dependances.forEach(startDependance);
    } else {
        argv.slice(2).forEach(startDependance);
    }
});
