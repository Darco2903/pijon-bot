import { ResultAsync } from "neverthrow";
import { logger } from "./logger.js";
import { audioCache } from "./music-player/index.js";
import { registerPeriodicTasks } from "./periodics.js";
import type ClientWrapper from "./wrapper.js";
import { ytDlp } from "./yt-dlp/index.js";

export async function main(client: ClientWrapper<true>): Promise<void> {
    registerPeriodicTasks();

    const res = await ResultAsync.combine([
        //
        ytDlp.update(),
        audioCache.init(),
    ]);

    if (res.isErr()) {
        logger.error(`Failed to initialize the bot: ${res.error}`);
        process.exit(1);
    }
}
