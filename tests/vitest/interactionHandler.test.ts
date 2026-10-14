import { beforeEach, describe, expect, it, vi } from "vitest";
import { Collection, MessageFlags } from "discord.js";
import { fakeInteraction } from "./fakes/discord.js";

// Only used as a type, but keep the real client (and its imports) out
vi.mock("../../src/wrapper.js", () => ({ default: class {} }));

const { logger } = await import("../../src/logger.js");
const { handleInteraction } = await import("../../src/interactionHandler.js");

function fakeCommand() {
    return {
        execute: vi.fn().mockResolvedValue(undefined),
        autoComplete: vi.fn().mockResolvedValue(undefined),
    };
}

function fakeClient(commands: Record<string, unknown>) {
    return { commands: new Collection(Object.entries(commands)) } as never;
}

function chatInput(commandName = "ping", options: Parameters<typeof fakeInteraction>[0] = {}) {
    return fakeInteraction({ commandName, ...options });
}

function autocompleteInteraction(commandName = "ping") {
    return {
        ...fakeInteraction({ commandName }),
        isChatInputCommand: () => false,
        isAutocomplete: () => true,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("handleInteraction", () => {
    it("ignores interactions that aren't commands or autocomplete", async () => {
        const command = fakeCommand();
        const interaction = {
            ...chatInput(),
            isChatInputCommand: () => false,
            isAutocomplete: () => false,
        };

        await handleInteraction(fakeClient({ ping: command }), interaction as never);

        expect(command.execute).not.toHaveBeenCalled();
        expect(command.autoComplete).not.toHaveBeenCalled();
    });

    it("logs and stops on an unknown command", async () => {
        const command = fakeCommand();

        await handleInteraction(fakeClient({ ping: command }), chatInput("nope") as never);

        expect(command.execute).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith("No command matching nope was found.");
    });

    it("runs the command", async () => {
        const command = fakeCommand();
        const interaction = chatInput();

        await handleInteraction(fakeClient({ ping: command }), interaction as never);

        expect(command.execute).toHaveBeenCalledWith(interaction);
    });

    it("catches a rejected command", async () => {
        const command = fakeCommand();
        command.execute.mockRejectedValue(new Error("boom"));

        await expect(
            handleInteraction(fakeClient({ ping: command }), chatInput() as never),
        ).resolves.toBeUndefined();
        expect(logger.error).toHaveBeenCalledWith("Error executing command ping: Error: boom");
    });

    it("replies with an ephemeral error when the command throws synchronously", async () => {
        const command = fakeCommand();
        command.execute.mockImplementation(() => {
            throw new Error("sync boom");
        });
        const interaction = chatInput();

        await handleInteraction(fakeClient({ ping: command }), interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
        });
    });

    it("follows up instead when the reply was deferred", async () => {
        const command = fakeCommand();
        command.execute.mockImplementation(() => {
            throw new Error("sync boom");
        });
        const interaction = chatInput("ping", { deferred: true });

        await handleInteraction(fakeClient({ ping: command }), interaction as never);

        expect(interaction.followUp).toHaveBeenCalledWith({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
        });
        expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("routes autocomplete to the command", async () => {
        const command = fakeCommand();
        const interaction = autocompleteInteraction();

        await handleInteraction(fakeClient({ ping: command }), interaction as never);

        expect(command.autoComplete).toHaveBeenCalledWith(interaction);
        expect(command.execute).not.toHaveBeenCalled();
    });

    it("ignores autocomplete for a command without it", async () => {
        const command = { execute: vi.fn() };

        await expect(
            handleInteraction(fakeClient({ ping: command }), autocompleteInteraction() as never),
        ).resolves.toBeUndefined();
        expect(command.execute).not.toHaveBeenCalled();
    });
});
