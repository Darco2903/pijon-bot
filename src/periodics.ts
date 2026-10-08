import cron, { ScheduledTask } from "node-cron";
import { logger } from "./logger.js";
import { AUDIO_CACHE_PRUNE_CRON, YT_DLP_UPDATE_CRON } from "./consts.js";
import { ytDlp } from "./yt-dlp/index.js";
import { audioCache } from "./music-player/index.js";

const tasks: ScheduledTask[] = [];

async function runYtDlpUpdate(): Promise<void> {
    logger.info("Running periodic yt-dlp update...");
    await ytDlp.update();
}

async function runAudioCachePrune(): Promise<void> {
    logger.debug("Running periodic audio cache prune...");
    await audioCache.prune();
}

export function registerPeriodicTasks(): void {
    logger.info("Registering periodic tasks...");
    const ytdlpUpdateTask = cron.schedule(YT_DLP_UPDATE_CRON, runYtDlpUpdate, { timezone: "UTC" });
    const cachePruneTask = cron.schedule(AUDIO_CACHE_PRUNE_CRON, runAudioCachePrune, {
        timezone: "UTC",
    });
    tasks.push(ytdlpUpdateTask, cachePruneTask);
}

export async function stopPeriodicTasks(): Promise<void> {
    logger.info("Stopping periodic tasks...");
    for (const task of tasks) {
        await task.destroy();
    }
}
