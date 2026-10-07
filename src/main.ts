import { ResultAsync } from "neverthrow";
import { audioCache } from "./music-player/index.js";
import { ytDlp } from "./yt-dlp/index.js";

export function main(): ResultAsync<void, string> {
    return ResultAsync.combine([
        //
        ytDlp.update(),
        audioCache.init(),
    ]).map(() => undefined);
}
