import { Client, Collection, Events, GatewayIntentBits, Interaction, MessageFlags } from "discord.js";
import { logger } from "./logger.js";
import type { BotCommand } from "./types/BotCommand.js";
import { commands } from "./commands/index.js";
import { config } from "./config.js";

export default class ClientWrapper<T extends boolean> extends Client<T> {
    protected busy: boolean;
    public readonly commands: Collection<string, BotCommand>;

    constructor() {
        super({
            intents: [GatewayIntentBits.Guilds],
        });

        this.busy = false;
        this.commands = new Collection(Object.entries(commands));
    }

    // isBusy(): boolean {
    //     return this.busy;
    // }

    // setBusy(value: boolean): void {
    //     this.busy = value;
    // }

    // protected async waitForBusy(): Promise<void> {
    //     while (this.isBusy()) {
    //         await new Promise((resolve) => setTimeout(resolve, 1000));
    //     }
    // }

    protected async handleInteraction(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) {
            return;
        }

        const command = this.commands.get(interaction.commandName);
        if (command === undefined) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        if (interaction.isChatInputCommand()) {
            try {
                logger.info(`Executing command ${interaction.commandName} by user ${interaction.user.tag}`);
                await command.execute(interaction);
            } catch (error) {
                console.error(error);

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

    async start(): Promise<ClientWrapper<true>> {
        this.login(config.discord.token);
        return new Promise<ClientWrapper<true>>((resolve) => {
            this.once(Events.ClientReady, () => resolve(this as ClientWrapper<true>));

            // register the interaction handler
            this.on(Events.InteractionCreate, (interaction) => this.handleInteraction(interaction));
        });
    }

    async stop(this: ClientWrapper<true>): Promise<void> {
        // if (this.isBusy()) {
        //     logInfo("Client is busy, waiting...".yellow);
        //     await this.waitForBusy();
        // }

        logger.info("Stopping the client...");
        this.user?.setStatus("invisible");
        await this.destroy();
    }
}
