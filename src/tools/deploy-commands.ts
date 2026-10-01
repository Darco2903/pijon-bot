import { REST, Routes } from "discord.js";
import { config } from "../config.js";
import { commands as commandObj } from "../commands/index.js";

const commands = Object.values(commandObj).map((command) => command.data.toJSON());

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.discord.token);

// and deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        for (const guild of config.discord.guilds) {
            // The put method is used to fully refresh all commands in the guild with the current set
            const data = (await rest.put(Routes.applicationGuildCommands(config.discord.clientId, guild.id), {
                body: commands,
            })) as any[];

            console.log(`Successfully reloaded ${data.length} application (/) commands in guild ${guild.name}.`);
        }
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
