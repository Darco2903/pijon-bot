/**
 * Config every test sees instead of config.json and the env.
 * Tests may mutate it, setup.ts resets it before each test.
 */
export function defaultTestConfig() {
    return {
        database: { host: "localhost", user: "test", password: "test", name: "test" },
        discord: { clientId: "client-id", token: "token" },
        openai: { apiKey: "sk-test" },
        ai: { channels: [] as string[] },
        musicplayer: {
            cache: { path: "/tmp/pijon-test-cache", maxSize: 0, maxFileSize: 0, maxAge: 0 },
            queue_save: { enabled: false, path: "/tmp/pijon-test-queue.json" },
        },
        ytdlp: undefined as { cookie_file?: string } | undefined,
    };
}

export const testConfig = defaultTestConfig();
