import { AudioCache } from "./AudioCache.js";
import { config } from "../config.js";

export const audioCache = new AudioCache({
    dir: config.cache.path,
    maxSizeBytes: config.cache.maxSize,
});
