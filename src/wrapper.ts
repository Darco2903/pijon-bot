import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { logger } from "./logger.js";
import type { BotCommand } from "./types/BotCommand.js";
import { commands } from "./commands/index.js";
import { config } from "./config.js";
import { handleInteraction } from "./interactionHandler.js";
import { AudioPlayer } from "./music-player/AudioPlayer.js";
import { getVoiceConnections } from "@discordjs/voice";
import { stopMusicPlayer } from "./music-player/index.js";

export default class ClientWrapper<T extends boolean> extends Client<T> {
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

    public async start(): Promise<ClientWrapper<true>> {
        this.login(config.discord.token);
        const client = await new Promise<ClientWrapper<true>>((resolve) => {
            this.once(Events.ClientReady, () => resolve(this as ClientWrapper<true>));
        });

        // register the interaction handler
        this.on(Events.InteractionCreate, (interaction) => handleInteraction(client, interaction));
        return client;
    }

    public async stop(this: ClientWrapper<true>): Promise<void> {
        // if (this.isBusy()) {
        //     logInfo("Client is busy, waiting...".yellow);
        //     await this.waitForBusy();
        // }

        logger.info("Stopping the client...");
        this.user?.setStatus("invisible");
        await stopMusicPlayer();
        await this.destroy();
    }
}
