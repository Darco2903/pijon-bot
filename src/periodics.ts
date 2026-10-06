import cron from "node-cron";
import { logger } from "./logger.js";
import { YT_DLP_UPDATE_CRON } from "./consts.js";
import { ytDlp } from "./yt-dlp/index.js";

async function runYtDlpUpdate(): Promise<void> {
    logger.info("Running periodic yt-dlp update...");
    await ytDlp.update();
}

export function registerPeriodicTasks(): void {
    cron.schedule(YT_DLP_UPDATE_CRON, runYtDlpUpdate, { timezone: "UTC" });
}
