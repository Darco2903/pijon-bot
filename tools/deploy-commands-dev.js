const { REST, Routes } = require("discord.js");
const { color } = require("console-log-colors");
const { client: clientConfig } = require("../config.json");
const { clientId, guildIdDev, token } = clientConfig;
const getCommandFiles = require("./getCommandFiles");

const rest = new REST({ version: "10" }).setToken(token);
const commands = [];
const commandFiles = getCommandFiles();

commandFiles.forEach((file) => {
    try {
        const command = require(`../${file}`);
        command.data.description = `[DEV] ${command.data.description}`;
        commands.push(command.data.toJSON());
    } catch (error) {
        console.error(color.red(`Error processing ${file}`));
    }
});

(async () => {
    try {
        console.log(color.blueBright.bold(`Started refreshing ${color.magenta(commands.length)} application (/) commands in dev server.`));
        const data = await rest.put(Routes.applicationGuildCommands(clientId, guildIdDev), { body: commands });
        console.log(color.green.bold(`Successfully reloaded ${color.magenta(data.length)} application (/) commands in dev server.`));
    } catch (error) {
        console.error(color.red(error));
    }
})();
