import { beforeEach, vi } from "vitest";
import { defaultTestConfig, testConfig } from "./fakes/config.js";

// The real config.ts reads config.json and exits the process when it's invalid.
vi.mock("../../src/config.js", async () => {
    const { testConfig } = await import("./fakes/config.js");
    return { config: testConfig };
});

vi.mock("../../src/logger.js", () => ({
    logger: {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
    },
}));

beforeEach(() => {
    Object.assign(testConfig, defaultTestConfig());
});
