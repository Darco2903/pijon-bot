const { REST, Routes } = require("discord.js");
const { color } = require("console-log-colors");
const { clientId, guildIdDev, token } = require("./config.json");
const getCommandFiles = require("./getCommandFiles");

// Construct and prepare an instance of the REST module
const rest = new REST({ version: "10" }).setToken(token);

const commands = [];
const commandFiles = getCommandFiles();

commandFiles.forEach((file) => {
    try {
        const command = require(`./${file}`);
        commands.push(command.data.toJSON());
    } catch (error) {
        console.error(color.red(`Error processing ${file}`));
    }
});

(async () => {
    try {
        console.log(color.blueBright.bold(`Started refreshing ${color.magenta(commands.length)} application (/) commands in dev server.`));

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(Routes.applicationGuildCommands(clientId, guildIdDev), { body: commands });

        console.log(color.green.bold(`Successfully reloaded ${color.magenta(data.length)} application (/) commands in dev server.`));
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(color.red(error));
    }
})();
