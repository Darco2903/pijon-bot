import cron from "node-cron";
import { updateYtDlp } from "./yt-dlp/update.js";
import { logger } from "./logger.js";
import { YT_DLP_UPDATE_CRON } from "./consts.js";

async function runYtDlpUpdate(): Promise<void> {
    logger.info("Running periodic yt-dlp update...");
    await updateYtDlp();
}

export function registerPeriodicTasks(): void {
    cron.schedule(YT_DLP_UPDATE_CRON, runYtDlpUpdate, { timezone: "UTC" });
}
