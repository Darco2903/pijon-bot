const path = require("path");
const { REST, Routes } = require("discord.js");
const { colors, logInfo, logError, logDebug, setDebugMode } = require("logger");

const { dependencies, debug } = require("../utils/startArgs");

const { client_id, token } = require("../config/discord.json");

const DEPENDENCE_PATH = "../dependencies";

setDebugMode(debug);

let interactionData = [];
const rest = new REST({ version: "10" }).setToken(token);

logInfo(colors.blueBright.bold(`Started refreshing ${colors.magenta(dependencies.join(", "))} dependencies registration.`));

for (const dependence of dependencies) {
    try {
        logDebug(`Loading: ${dependence}`);

        const p = path.resolve(__dirname, DEPENDENCE_PATH, dependence, "index");

        /** @type {import("../dependencies/types").Dependence} */
        const dep = require(p);

        const data = dep.interactions?.map((interaction) => interaction.data);
        interactionData.push(...data);
        const depen = `./${dependence}/index`;
        logInfo(colors.green(`${dependence} loaded`));
    } catch (error) {
        logError(`Failed to launch dependence: ${dependence}`);
        logDebug(error.message);
    }
}

logInfo(colors.blueBright.bold(`Refreshing ${colors.magenta(interactionData.length)} application (/) commands.`));

rest.put(Routes.applicationCommands(client_id), { body: interactionData })
    .then((data) => {
        logInfo(colors.green.bold(`Successfully reloaded ${colors.magenta(data.length)} application (/) commands.`));
    })
    .catch((error) => {
        logError("Failed to reload application (/) commands.");
        logDebug(error);
    });
