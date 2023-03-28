const { REST, Routes } = require("discord.js");
const { color } = require("console-log-colors");
const { client: config } = require("../config.json");
const getCommandFiles = require("./getCommandFiles");

const rest = new REST({ version: "10" }).setToken(config.token);
let commands = [];
const commandFiles = getCommandFiles();

commandFiles.forEach((file) => {
    try {
        const command = require(`../${file}`);
        commands.push(command.data.toJSON());
    } catch (error) {
        console.error(color.red(`Error processing ${file}`));
    }
});

(async () => {
    try {
        console.log(color.blueBright.bold(`Started refreshing ${color.magenta(commands.length)} application (/) commands.`));
        const data = await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
        console.log(color.green.bold(`Successfully reloaded ${color.magenta(data.length)} application (/) commands.`));
    } catch (error) {
        console.error(color.red(error));
    }
})();
