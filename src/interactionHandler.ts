import { MessageFlags, type Interaction } from "discord.js";
import { logger } from "./logger.js";
import ClientWrapper from "./wrapper.js";

export async function handleInteraction(client: ClientWrapper<true>, interaction: Interaction): Promise<void> {
    // console.log("Handling interaction:", interaction.type, interaction.commandName);

    if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) {
        return;
    }

    const command = client.commands.get(interaction.commandName);
    if (command === undefined) {
        logger.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    logger.info(`Executing command ${interaction.commandName} by user ${interaction.user.tag}`);

    if (interaction.isChatInputCommand()) {
        try {
            logger.info(`Executing command ${interaction.commandName} by user ${interaction.user.tag}`);
            await command.execute(interaction);
        } catch (error) {
            logger.error(error);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "There was an error while executing this command!",
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    content: "There was an error while executing this command!",
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    } else if (interaction.isAutocomplete() && command.autoComplete !== undefined) {
        await command.autoComplete(interaction);
    }
}
