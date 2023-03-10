const Utils = require("./Utils");
const { argv } = require("process");
const client = require("./client");
const { ActivityType, Events, PresenceUpdateStatus } = require("discord.js");

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

require("./distube");
require("./openai");

client.on("presence:setDefault", setDefaultPresence);
client.once(Events.ClientReady, () => {
    client.Log.info(`Logged in as ${client.user.tag}`);
    client.Log.debug("Launched in debug mode");
    client.Log.verbose("Launched with verbose");
    initPresence();
});
