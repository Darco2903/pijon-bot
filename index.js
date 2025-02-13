const { colors, logInfo, logDebug, logError, setDebugMode, setDevMode } = require("logger");

const { client } = require("./client");
const { db } = require("./database/index");
const { debug, dev } = require("./utils/startArgs");
const {} = require("./utils/utils");
const { launchDependencies, stopDependencies } = require("./dependencies/index");

const { token } = require("./config/discord.json");

let shuttingdown = false;

setDebugMode(debug);
setDevMode(dev);

logDebug("Launched in debug mode");

async function shutdown() {
    if (shuttingdown) return;
    shuttingdown = true;

    if (!client.isReady()) {
        await new Promise((resolve) => client.once("ready", resolve));
    }

    client.user.setStatus("dnd");
    client.user.setActivity("Arrêt en cours...", { type: 4 });

    logInfo(colors.magenta("Stopping dependencies..."));
    await stopDependencies();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    logInfo(colors.magenta("Shutting down..."));
    const p1 = client.destroy();
    const p2 = db.disconnect();
    await Promise.all([p1, p2]);
    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("uncaughtException", (err) => {
    logError(err);
    logDebug(err.stack);
    shutdown();
});

client.on("debug", (message) => {
    console.log(message);
});

distube.on("debug", (message) => {
    console.log(message);
});

(async () => {
    logDebug("Connecting to database...");
    await db.connect().catch((error) => {
        logError("Database connection failed");
        logDebug(error.message);
        process.exit(1);
    });
    logInfo("Database connected");

    // launch dependencies
    logDebug("Launching dependencies...");
    await launchDependencies();
    logDebug("Dependencies launched");

    logDebug("Logging in...");
    await client.login(token);

    logInfo(colors.cyan("Pijon Bot started successfully"));

    if (client.user.presence.status !== "online") {
        client.user.setStatus("online");
    }

    // const end = new Date();
    // end.setMinutes(end.getMinutes() + 3);
    // client.user.setActivity({
    //     name: "How Sweet - NewJeans",
    //     type: 2,
    //     // url: "https://www.youtube.com/watch?v=5Tsp_Lj0qy4",
    //     details: "How Sweet",
    //     state: "NewJeans",
    //     // applicationId: null,
    //     timestamps: { start: new Date(), end: end },
    //     // party: { id: "spotify:838620835282812969" },
    //     assets: {
    //         largeText: "Song",
    //         smallText: null,
    //         largeImage: "https://i.ytimg.com/vi/u4uOC9mXaBk/hqdefault.jpg",
    //         smallImage:
    //             "https://i.ytimg.com/vi/u4uOC9mXaBk/hqdefault.jpg?sqp=-oaymwEiCKgBEF5IWvKriqkDFQgBFQAAAAAYASUAAMhCPQCAokN4AQ==&rs=AOn4CLBtaF_AeGp-zfkmoG7lqRwRfOHv6w",
    //     },
    //     flags: { bitfield: 48 },
    //     emoji: null,
    //     buttons: [],
    //     createdTimestamp: new Date().getTime(),
    // });
})();
