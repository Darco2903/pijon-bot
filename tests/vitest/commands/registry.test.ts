import { describe, expect, it, vi } from "vitest";

// The commands only need to load, nothing runs
vi.mock("../../../src/music-player/AudioPlayer.js", () => ({ AudioPlayer: {} }));
vi.mock("../../../src/music-player/resolve.js", () => ({ resolveTrackId: vi.fn() }));
vi.mock("../../../src/voice.js", () => ({ joinVoice: vi.fn(), leaveVoice: vi.fn() }));
vi.mock("../../../src/yt-dlp/index.js", () => ({ ytDlp: {} }));
vi.mock("../../../src/prisma.js", () => ({ prisma: {} }));

const { commands } = await import("../../../src/commands/index.js");

describe("command registry", () => {
    const entries = Object.entries(commands);

    it("registers every command", () => {
        expect(Object.keys(commands).sort()).toEqual([
            "join",
            "leave",
            "next",
            "pause",
            "play",
            "previous",
            "resume",
            "seek",
            "stop",
        ]);
    });

    it.each(entries)("%s is registered under its own name", (key, command) => {
        expect(command.data.name).toBe(key);
    });

    it.each(entries)("%s builds valid command data", (_key, command) => {
        const json = command.data.toJSON();
        expect(json.name).toMatch(/^[a-z]+$/);
        expect(json.description.length).toBeGreaterThan(0);
        expect(typeof command.execute).toBe("function");
    });

    it("only /play has autocomplete", () => {
        const withAutocomplete = entries
            .filter(([, command]) => command.autoComplete !== undefined)
            .map(([key]) => key);
        expect(withAutocomplete).toEqual(["play"]);
    });
});
