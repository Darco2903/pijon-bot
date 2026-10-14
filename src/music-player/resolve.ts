import { escapeMarkdown } from "discord.js";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { getVideoID, validateID, validateURL } from "../yt-dlp/yt-dlp.js";
import { ytDlp } from "../yt-dlp/index.js";
import { logger } from "../logger.js";

/** Video id from a YouTube URL, an id, or the first search result. Errors are user-facing. */
export function resolveTrackId(query: string): ResultAsync<string, string> {
    if (validateURL(query)) {
        return okAsync(getVideoID(query));
    }

    if (validateID(query)) {
        return okAsync(query);
    }

    return ytDlp
        .search(query, 1)
        .orTee((error) => {
            logger.error(`Failed to search for query "${query}": ${error}`);
        })
        .mapErr(() => "The search failed, try again.")
        .andThen((results) => {
            if (results.length === 0) {
                logger.debug(`No search results found for query "${query}"`);
                return errAsync(`No results for *${escapeMarkdown(query)}*.`);
            }

            logger.debug(`First search result: ${results[0].title}`);
            return okAsync(results[0].id);
        });
}
