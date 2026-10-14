import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIO_CACHE_PRUNE_CRON, YT_DLP_UPDATE_CRON } from "../../src/consts.js";

vi.mock("node-cron", () => ({
    default: { schedule: vi.fn(() => ({ destroy: vi.fn().mockResolvedValue(undefined) })) },
}));
vi.mock("../../src/yt-dlp/index.js", () => ({ ytDlp: { update: vi.fn() } }));
vi.mock("../../src/music-player/index.js", () => ({ audioCache: { prune: vi.fn() } }));

const { default: cron } = await import("node-cron");
const { ytDlp } = await import("../../src/yt-dlp/index.js");
const { audioCache } = await import("../../src/music-player/index.js");

/** periodics.ts keeps its tasks in module state, so each test gets a fresh copy */
async function loadPeriodics() {
    vi.resetModules();
    return import("../../src/periodics.js");
}

type Callback = () => Promise<void>;

function scheduled(expression: string): { callback: Callback; options: unknown } {
    const call = vi.mocked(cron.schedule).mock.calls.find(([expr]) => expr === expression);
    if (!call) throw new Error(`Nothing scheduled for ${expression}`);
    return { callback: call[1] as Callback, options: call[2] };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("periodic tasks", () => {
    it("schedules the yt-dlp update and the cache prune in UTC", async () => {
        const { registerPeriodicTasks } = await loadPeriodics();

        registerPeriodicTasks();

        expect(cron.schedule).toHaveBeenCalledTimes(2);
        expect(scheduled(YT_DLP_UPDATE_CRON).options).toEqual({ timezone: "UTC" });
        expect(scheduled(AUDIO_CACHE_PRUNE_CRON).options).toEqual({ timezone: "UTC" });
    });

    it("updates yt-dlp when the update task runs", async () => {
        const { registerPeriodicTasks } = await loadPeriodics();
        registerPeriodicTasks();

        await scheduled(YT_DLP_UPDATE_CRON).callback();

        expect(ytDlp.update).toHaveBeenCalledTimes(1);
        expect(audioCache.prune).not.toHaveBeenCalled();
    });

    it("prunes the audio cache when the prune task runs", async () => {
        const { registerPeriodicTasks } = await loadPeriodics();
        registerPeriodicTasks();

        await scheduled(AUDIO_CACHE_PRUNE_CRON).callback();

        expect(audioCache.prune).toHaveBeenCalledTimes(1);
        expect(ytDlp.update).not.toHaveBeenCalled();
    });

    it("destroys both tasks on stop", async () => {
        const { registerPeriodicTasks, stopPeriodicTasks } = await loadPeriodics();
        registerPeriodicTasks();
        const tasks = vi
            .mocked(cron.schedule)
            .mock.results.map((result) => result.value as { destroy: ReturnType<typeof vi.fn> });

        await stopPeriodicTasks();

        expect(tasks).toHaveLength(2);
        for (const task of tasks) expect(task.destroy).toHaveBeenCalledTimes(1);
    });
});
