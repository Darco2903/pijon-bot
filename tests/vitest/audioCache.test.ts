import fs from "fs/promises";
import { randomUUID } from "crypto";
import { describe, it, expect, vi } from "vitest";
import { AudioCache } from "../../src/music-player/AudioCache.js";
import { YtDlp } from "../../src/yt-dlp/yt-dlp.js";
import { Hour } from "@darco2903/secondthought";

const ytDlp = new YtDlp();

describe("AudioCache", () => {
    it("should initialize the cache directory", async () => {
        const dir = `/tmp/audio-cache-test/${randomUUID()}`;
        console.log("dir:", dir);

        const cache = new AudioCache(ytDlp, {
            dir: dir,
            maxSizeBytes: 1024 * 1024 * 100, // 100 MB
            maxFileSizeBytes: 0,
            ttl: new Hour(1).toSecond(),
        });

        const res = await cache.init();
        expect(res.isOk()).toBeTruthy();
    });

    it("should clean up .part files and rebuild index", async () => {
        const dir = `/tmp/audio-cache-test/${randomUUID()}`;
        const cache = new AudioCache(ytDlp, {
            dir: dir,
            maxSizeBytes: 1024 * 1024 * 100, // 100 MB
            maxFileSizeBytes: 0,
            ttl: new Hour(1).toSecond(),
        });

        // Create a .part file and a valid cache file
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(`${dir}/test.part`, "partial data");
        await fs.writeFile(`${dir}/valid.mp3`, "valid data");

        const res = await cache.init();
        expect(res.isOk()).toBeTruthy();

        // Check that the .part file is deleted and the valid file is indexed
        const entries = await fs.readdir(dir);
        expect(entries).not.toContain("test.part");
        expect(entries).toContain("valid.mp3");
        expect(cache.has("valid.mp3")).toBeTruthy();
    });
});
