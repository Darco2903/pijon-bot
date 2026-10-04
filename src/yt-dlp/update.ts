import { ResultAsync } from "neverthrow";
import { ytDlp } from "./index.js";
import { logger } from "../logger.js";

export function updateYtDlp(): ResultAsync<string, string> {
    return ytDlp
        .run(["-U"])
        .andTee((result) => {
            logger.info("yt-dlp update:");
            logger.info(result);
        })
        .orTee((err) => {
            logger.error("Failed to update yt-dlp");
            logger.error(err);
        });
}
