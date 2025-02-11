const { colors, logInfo, logDebug, logError, setDebugMode, setDevMode } = require("logger");

const { client } = require("./client");
const { db } = require("./database/index");
const { debug, dev } = require("./utils/startArgs");
const {} = require("./utils/utils");
const { launchDependencies } = require("./dependencies/index");

const { token } = require("./config/discord.json");

setDebugMode(debug);
setDevMode(dev);

logDebug("Launched in debug mode");

async function shutdown() {
    if (!client.isReady()) return;
    logInfo(colors.magenta("Shutting down..."));
    const p1 = client.destroy();
    const p2 = db.disconnect();
    await Promise.all([p1, p2]);
    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

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
    const dependenceExports = launchDependencies();
    logDebug("Dependencies launched");

    logDebug("Logging in...");
    await client.login(token);

    logInfo(colors.cyan("Pijon Bot started successfully"));

    if (client.user.presence.status !== "online") {
        client.user.setStatus("online");
    }
})();
