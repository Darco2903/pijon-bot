import cron, { ScheduledTask } from "node-cron";
import { logger } from "./logger.js";
import { YT_DLP_UPDATE_CRON } from "./consts.js";
import { ytDlp } from "./yt-dlp/index.js";

const tasks: ScheduledTask[] = [];

async function runYtDlpUpdate(): Promise<void> {
    logger.info("Running periodic yt-dlp update...");
    await ytDlp.update();
}

export function registerPeriodicTasks(): void {
    logger.info("Registering periodic tasks...");
    const ytdlpUpdateTask = cron.schedule(YT_DLP_UPDATE_CRON, runYtDlpUpdate, { timezone: "UTC" });
    tasks.push(ytdlpUpdateTask);
}

export async function stopPeriodicTasks(): Promise<void> {
    logger.info("Stopping periodic tasks...");
    for (const task of tasks) {
        await task.destroy();
    }
}
