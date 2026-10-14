import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// This file tests the real module, setup.ts mocks it for everyone else.
vi.unmock("../../src/config.js");

const ENV = {
    DATABASE_HOST: "db",
    DATABASE_USER: "user",
    DATABASE_PASSWORD: "pass",
    DATABASE_NAME: "pijon",
    DISCORD_CLIENT_ID: "123",
    DISCORD_TOKEN: "token",
    OPENAI_API_KEY: "sk-test",
};

const FILE_CONFIG = {
    musicplayer: {
        cache: { path: "/tmp/cache", maxSize: 0, maxFileSize: 0, maxAge: 0 },
        queue_save: { enabled: true, path: "/tmp/queue.json" },
    },
};

let dir: string;
let cwd: string;
const savedEnv: Record<string, string | undefined> = {};

async function writeConfig(content: unknown): Promise<void> {
    await fs.writeFile(path.join(dir, "config.json"), JSON.stringify(content));
}

async function loadConfig() {
    vi.resetModules();
    const mod = await import("../../src/config.js");
    return mod.config;
}

describe("config", () => {
    beforeEach(async () => {
        dir = path.join(os.tmpdir(), `pijon-config-test-${randomUUID()}`);
        await fs.mkdir(dir, { recursive: true });
        cwd = process.cwd();
        process.chdir(dir);

        for (const [key, value] of Object.entries(ENV)) {
            savedEnv[key] = process.env[key];
            process.env[key] = value;
        }

        vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
            throw new Error(`process.exit(${code})`);
        }) as never);
    });

    afterEach(async () => {
        process.chdir(cwd);
        for (const [key, value] of Object.entries(savedEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
        await fs.rm(dir, { recursive: true, force: true });
    });

    it("parses the env and config.json", async () => {
        await writeConfig(FILE_CONFIG);

        const config = await loadConfig();
        expect(config.database).toEqual({
            host: "db",
            user: "user",
            password: "pass",
            name: "pijon",
        });
        expect(config.discord).toEqual({ clientId: "123", token: "token" });
        expect(config.openai.apiKey).toBe("sk-test");
        expect(config.musicplayer.queue_save).toEqual({ enabled: true, path: "/tmp/queue.json" });
    });

    it("defaults ai.channels to an empty list", async () => {
        await writeConfig(FILE_CONFIG);

        const config = await loadConfig();
        expect(config.ai.channels).toEqual([]);
    });

    it("reads ai.channels from config.json", async () => {
        await writeConfig({ ...FILE_CONFIG, ai: { channels: ["c1", "c2"] } });

        const config = await loadConfig();
        expect(config.ai.channels).toEqual(["c1", "c2"]);
    });

    it("exits when OPENAI_API_KEY is missing", async () => {
        await writeConfig(FILE_CONFIG);
        delete process.env.OPENAI_API_KEY;

        await expect(loadConfig()).rejects.toThrow("process.exit(1)");
    });

    it("exits when config.json can't be read", async () => {
        await expect(loadConfig()).rejects.toThrow("process.exit(1)");
    });

    it("exits when config.json is not valid JSON", async () => {
        await fs.writeFile(path.join(dir, "config.json"), "{nope");

        await expect(loadConfig()).rejects.toThrow("process.exit(1)");
    });

    it("exits when the yt-dlp cookie file doesn't exist", async () => {
        await writeConfig({
            ...FILE_CONFIG,
            ytdlp: { cookie_file: path.join(dir, "missing.txt") },
        });

        await expect(loadConfig()).rejects.toThrow("process.exit(1)");
    });

    it("accepts an existing yt-dlp cookie file", async () => {
        const cookie = path.join(dir, "cookies.txt");
        await fs.writeFile(cookie, "");
        await writeConfig({ ...FILE_CONFIG, ytdlp: { cookie_file: cookie } });

        const config = await loadConfig();
        expect(config.ytdlp?.cookie_file).toBe(cookie);
    });
});
