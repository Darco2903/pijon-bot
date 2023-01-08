const { REST, Routes } = require("discord.js");
const { clientId, token } = require("./config.json");
const getCommandFiles = require("./getCommandFiles");
const { color } = require("console-log-colors");

// Construct and prepare an instance of the REST module
const rest = new REST({ version: "10" }).setToken(token);

const commands = [];
// Grab all the command files from the commands directories
const commandFiles = getCommandFiles();
// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment

commandFiles.forEach((file) => {
    if (file.includes("dev")) return;
    try {
        const command = require(`./${file}`);
        commands.push(command.data.toJSON());
    } catch (error) {
        console.error(color.red(`Error processing ${file}`));
    }
});

// and deploy your commands!
(async () => {
    try {
        console.log(color.blueBright.bold(`Started refreshing ${color.magenta(commands.length)} application (/) commands.`));

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });

        console.log(color.green.bold(`Successfully reloaded ${color.magenta(data.length)} application (/) commands.`));
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(color.red(error));
    }
})();
