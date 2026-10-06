import { config } from "../config.js";
import { YtDlp } from "./yt-dlp.js";

export const ytDlp = new YtDlp({
    extraArgs: ["--cookies", config.ytdlp.cookie_file],
});
