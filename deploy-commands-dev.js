const { REST, Routes } = require("discord.js");
const { clientId, guildId, token } = require("./config.json");
const fs = require("fs");
const path = require("path");
const { color } = require("console-log-colors");

// Construct and prepare an instance of the REST module
const rest = new REST({ version: "10" }).setToken(token);

const commands = [];
const commandsPath = path.join(".", "dev", "commands");
const commandsFiles = fs.readdirSync(commandsPath);

commandsFiles.forEach((file) => {
    try {
        const command = require(`./${path.join(commandsPath, file)}`);
        commands.push(command.data.toJSON());
    } catch (error) {
        console.error(color.red(`Error processing ${file}`));
    }
});

(async () => {
    try {
        console.log(color.blueBright.bold(`Started refreshing ${color.magenta(commands.length)} application (/) commands.`));

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });

        console.log(color.green.bold(`Successfully reloaded ${color.magenta(data.length)} application (/) commands.`));
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(color.red(error));
    }
})();
