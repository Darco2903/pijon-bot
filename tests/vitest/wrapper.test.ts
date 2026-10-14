import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Events, GatewayIntentBits, Partials } from "discord.js";

vi.mock("../../src/commands/index.js", () => ({
    commands: { ping: { data: { name: "ping" }, execute: vi.fn() } },
}));
vi.mock("../../src/interactionHandler.js", () => ({ handleInteraction: vi.fn() }));
vi.mock("../../src/music-player/index.js", () => ({
    stopMusicPlayer: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../src/voice.js", () => ({ handleVoiceStateUpdate: vi.fn() }));
vi.mock("../../src/openai/message.js", () => ({ handleMessageCreate: vi.fn() }));

const { handleInteraction } = await import("../../src/interactionHandler.js");
const { stopMusicPlayer } = await import("../../src/music-player/index.js");
const { handleVoiceStateUpdate } = await import("../../src/voice.js");
const { handleMessageCreate } = await import("../../src/openai/message.js");
const { default: ClientWrapper } = await import("../../src/wrapper.js");

const handledEvents = [Events.InteractionCreate, Events.VoiceStateUpdate, Events.MessageCreate];

let client: InstanceType<typeof ClientWrapper>;

/** login() resolves, then the client becomes ready */
function loginSucceeds() {
    return vi.spyOn(client, "login").mockImplementation(async () => {
        setTimeout(() => client.emit(Events.ClientReady, client as never), 0);
        return "token";
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    client = new ClientWrapper();
});

afterEach(async () => {
    await client.destroy();
});

describe("ClientWrapper", () => {
    it("asks for the intents the bot needs, DMs included", () => {
        const intents = client.options.intents;
        for (const intent of [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
        ]) {
            expect(intents.has(intent)).toBe(true);
        }
    });

    it("enables the channel partial so DMs arrive", () => {
        expect(client.options.partials).toContain(Partials.Channel);
    });

    it("loads the command registry", () => {
        expect([...client.commands.keys()]).toEqual(["ping"]);
    });

    it("registers no handler before start", () => {
        for (const event of handledEvents) expect(client.listenerCount(event)).toBe(0);
    });

    it("logs in with the configured token and registers the handlers once ready", async () => {
        const login = loginSucceeds();

        const res = await client.start();

        expect(res.isOk()).toBe(true);
        expect(login).toHaveBeenCalledWith("token");
        for (const event of handledEvents) expect(client.listenerCount(event)).toBe(1);
    });

    it("forwards the events to their handlers", async () => {
        loginSucceeds();
        await client.start();
        const interaction = { id: "interaction" };
        const message = { id: "message" };
        const oldState = { id: "old" };
        const newState = { id: "new" };

        client.emit(Events.InteractionCreate, interaction as never);
        client.emit(Events.MessageCreate, message as never);
        client.emit(Events.VoiceStateUpdate, oldState as never, newState as never);

        expect(handleInteraction).toHaveBeenCalledWith(client, interaction);
        expect(handleMessageCreate).toHaveBeenCalledWith(message);
        expect(handleVoiceStateUpdate).toHaveBeenCalledWith(oldState, newState);
    });

    it("fails without registering handlers when login fails", async () => {
        vi.spyOn(client, "login").mockRejectedValue(new Error("An invalid token was provided."));

        const res = await client.start();

        expect(res._unsafeUnwrapErr()).toBe(
            "Failed to login: Error: An invalid token was provided.",
        );
        for (const event of handledEvents) expect(client.listenerCount(event)).toBe(0);
    });

    it("stops the music player and destroys the client on stop", async () => {
        const destroy = vi.spyOn(client, "destroy");

        await client.stop();

        expect(stopMusicPlayer).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledTimes(1);
    });
});
