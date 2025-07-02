const { colors, logInfo, logDebug, logError, logWarning } = require("logger");

const { client } = require("../client");
const { dependencies } = require("../utils/startArgs");

const registeredCommands = new Map();
const registerdAutocompletes = new Map();
const exp = {};

async function launchDependencies() {
    for (const dependence of dependencies) {
        try {
            logDebug(`Launching dependence: ${dependence}`);

            /** @type {import("./types").Dependence} */
            const dep = require(`./${dependence}/index`);

            dep.interactions?.forEach((interaction) => {
                // logDebug(`Registering interaction: ${interaction.data.name}`);

                if (interaction.execute) {
                    registeredCommands.set(interaction.data.name, interaction.execute);
                }

                if (interaction.autocomplete) {
                    registerdAutocompletes.set(interaction.data.name, interaction.autocomplete);
                }
            });

            await dep.preStart?.();

            client.once("ready", async () => await dep.start?.());

            exp[dependence] = dep;

            logInfo(colors.green(`${dependence} started`));
        } catch (error) {
            logError(`Failed to launch dependence: ${dependence}`);
            logDebug(error.stack);
        }
    }
    // return exp;
}

async function stopDependencies() {
    for (const dependence of dependencies) {
        try {
            logDebug(`Stopping dependence: ${dependence}`);

            /** @type {import("./types").Dependence} */
            const dep = require(`./${dependence}/index`);

            await dep.stop?.();

            logInfo(colors.green(`${dependence} stopped`));
        } catch (error) {
            logError(`Failed to stop dependence: ${dependence}`);
            logDebug(error.message);
        }
    }
}

/**
 * @param {import("discord.js").CommandInteraction} interaction
 */
async function handleCommand(interaction) {
    const command = registeredCommands.get(interaction.commandName);
    if (!command) {
        logError(`Command not found: ${interaction.commandName}`);
        return;
    }

    try {
        await command(interaction);
    } catch (error) {
        logError(`Failed to execute command: ${interaction.commandName}`);
        logDebug(error.message);
    }
}

/**
 * @param {import("discord.js").CommandInteraction} interaction
 */
async function handleAutocomplete(interaction) {
    const autocomplete = registerdAutocompletes.get(interaction.commandName);
    if (!autocomplete) {
        logError(`Autocomplete not found: ${interaction.commandName}`);
        return;
    }

    try {
        await autocomplete(interaction);
    } catch (error) {
        logError(`Failed to execute autocomplete: ${interaction.commandName}`);
        logDebug(error.message);
    }
}

client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand()) {
        await handleCommand(interaction);
    } else if (interaction.isAutocomplete()) {
        await handleAutocomplete(interaction);
    } else {
        logWarning(`No handler for interaction type: ${interaction.type}`);
    }
});

module.exports = {
    launchDependencies,
    stopDependencies,
};
