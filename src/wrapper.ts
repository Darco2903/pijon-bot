import { Client, Collection, Events, GatewayIntentBits, Partials } from "discord.js";
import { logger } from "./logger.js";
import type { BotCommand } from "./types/BotCommand.js";
import { commands } from "./commands/index.js";
import { config } from "./config.js";
import { handleInteraction } from "./interactionHandler.js";
import { stopMusicPlayer } from "./music-player/index.js";
import { handleVoiceStateUpdate } from "./voice.js";
import { ResultAsync } from "neverthrow";
import { handleMessageCreate } from "./openai/message.js";

export default class ClientWrapper<T extends boolean = boolean> extends Client<T> {
    protected busy: boolean;
    public readonly commands: Collection<string, BotCommand>;

    constructor() {
        super({
            intents: [
                //
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
            partials: [
                //
                Partials.Channel,
            ],
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

    public waitForReady(): Promise<ClientWrapper<true>> {
        return new Promise((resolve) => {
            if (this.isReady()) {
                resolve(this);
            } else {
                this.once(Events.ClientReady, () => resolve(this as ClientWrapper<true>));
            }
        });
    }

    public start(): ResultAsync<ClientWrapper<true>, string> {
        return ResultAsync.fromPromise(
            this.login(config.discord.token),
            (err) => `Failed to login: ${err}`,
        )
            .andThen(() => ResultAsync.fromSafePromise(this.waitForReady()))
            .andTee((client) => {
                // register the interaction handler
                this.on(Events.InteractionCreate, (interaction) =>
                    handleInteraction(client, interaction),
                );
                // leave voice channels when nobody is listening
                this.on(Events.VoiceStateUpdate, handleVoiceStateUpdate);
                this.on(Events.MessageCreate, handleMessageCreate);
            });
    }

    public async stop(): Promise<void> {
        // if (this.isBusy()) {
        //     logger.info("Client is busy, waiting...");
        //     await this.waitForBusy();
        // }

        logger.info("Stopping the client...");
        this.user?.setStatus("invisible");
        await stopMusicPlayer();
        await this.destroy();
        logger.info("Client stopped successfully");
    }
}
