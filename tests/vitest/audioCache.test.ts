import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { PassThrough, type Readable } from "stream";
import { describe, it, expect, vi, afterEach } from "vitest";
import { okAsync } from "neverthrow";
import { AudioCache } from "../../src/music-player/AudioCache.js";
import { YtDlp } from "../../src/yt-dlp/yt-dlp.js";
import { Hour, Second } from "@darco2903/secondthought";

// ffmpeg isn't needed here: the "decoded" stream is the input itself
vi.mock("../../src/music-player/ffmpegPlayer.js", () => ({
    createPcmStream: (input: Readable) => input,
}));

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

const dirs: string[] = [];

function tempDir(): string {
    const dir = path.join(os.tmpdir(), "audio-cache-test", randomUUID());
    dirs.push(dir);
    return dir;
}

interface CacheOptions {
    maxSizeBytes?: number;
    maxFileSizeBytes?: number;
    ttl?: Second;
}

/** A YtDlp whose stream() hands out PassThroughs the test writes to */
function fakeYtDlp() {
    const downloads: { url: string; stream: PassThrough; kill: ReturnType<typeof vi.fn> }[] = [];
    const stream = vi.fn((url: string) => {
        const download = { url, stream: new PassThrough(), kill: vi.fn() };
        downloads.push(download);
        return { stream: download.stream, kill: download.kill };
    });
    return { ytDlp: { stream } as unknown as YtDlp, stream, downloads };
}

function makeCache(dir: string, options: CacheOptions = {}, yt: YtDlp = ytDlp): AudioCache {
    return new AudioCache(yt, {
        dir,
        maxSizeBytes: options.maxSizeBytes ?? 0,
        maxFileSizeBytes: options.maxFileSizeBytes ?? 0,
        ttl: options.ttl ?? new Second(0),
    });
}

/** Writes a file with an mtime `ageMs` in the past */
async function writeAged(file: string, content: string, ageMs: number): Promise<void> {
    await fs.writeFile(file, content);
    const time = new Date(Date.now() - ageMs);
    await fs.utimes(file, time, time);
}

function readAll(stream: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString()));
        stream.on("error", reject);
    });
}

async function exists(file: string): Promise<boolean> {
    return fs
        .access(file)
        .then(() => true)
        .catch(() => false);
}

describe("AudioCache init and prune", () => {
    afterEach(async () => {
        await Promise.all(
            dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
        );
    });

    it("should create the cache directory when it's missing", async () => {
        const dir = tempDir();
        const cache = makeCache(dir);

        const res = await cache.init();

        expect(res._unsafeUnwrap()).toEqual({ entryCount: 0 });
        expect((await fs.stat(dir)).isDirectory()).toBe(true);
    });

    it("should delete entries older than the ttl", async () => {
        const dir = tempDir();
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(`${dir}/old`, "123456");
        await fs.writeFile(`${dir}/new`, "abc");
        const cache = makeCache(dir, { ttl: new Second(60) });
        await cache.init();

        const time = new Date(Date.now() - 120_000);
        await fs.utimes(`${dir}/old`, time, time);
        const res = await cache.prune();

        expect(res._unsafeUnwrap()).toEqual({ removed: 1, freedBytes: 6, totalBytes: 3 });
        expect(cache.has("old")).toBe(false);
        expect(cache.has("new")).toBe(true);
        expect(await exists(`${dir}/old`)).toBe(false);
    });

    it("should keep everything when the ttl is 0", async () => {
        const dir = tempDir();
        await fs.mkdir(dir, { recursive: true });
        await writeAged(`${dir}/ancient`, "data", 365 * 24 * 3600 * 1000);
        const cache = makeCache(dir, { ttl: new Second(0) });

        await cache.init();

        expect(cache.has("ancient")).toBe(true);
    });

    it("should evict the least recently accessed entries until the cache fits", async () => {
        const dir = tempDir();
        await fs.mkdir(dir, { recursive: true });
        await writeAged(`${dir}/a`, "aaaaaa", 30_000);
        await writeAged(`${dir}/b`, "bbbbbb", 20_000);
        await writeAged(`${dir}/c`, "cccccc", 10_000);
        const cache = makeCache(dir, { maxSizeBytes: 12 });
        await cache.init();

        expect(cache.has("a")).toBe(false);
        expect(cache.has("b")).toBe(true);
        expect(cache.has("c")).toBe(true);
        expect(await exists(`${dir}/a`)).toBe(false);
        expect((await cache.prune())._unsafeUnwrap()).toEqual({
            removed: 0,
            freedBytes: 0,
            totalBytes: 12,
        });
    });

    it("should drop index entries whose file was deleted from outside", async () => {
        const dir = tempDir();
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(`${dir}/gone`, "data");
        const cache = makeCache(dir);
        await cache.init();

        await fs.unlink(`${dir}/gone`);
        const res = await cache.prune();

        expect(cache.has("gone")).toBe(false);
        // nothing was deleted by the cache itself
        expect(res._unsafeUnwrap()).toEqual({ removed: 0, freedBytes: 0, totalBytes: 0 });
    });

    it("should share one run between overlapping prune calls", async () => {
        const dir = tempDir();
        const cache = makeCache(dir);
        await cache.init();

        const first = cache.prune();
        const second = cache.prune();

        expect(second).toBe(first);
        await first;
        // a new call after the end starts a new run
        expect(cache.prune()).not.toBe(first);
    });
});

describe("AudioCache index", () => {
    afterEach(async () => {
        await Promise.all(
            dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
        );
    });

    it("should expose entries through get and has", async () => {
        const dir = tempDir();
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(`${dir}/song`, "data");
        const cache = makeCache(dir);
        await cache.init();

        expect(cache.has("song")).toBe(true);
        expect(cache.get("song")).toEqual({ key: "song", path: `${dir}/song` });
        expect(cache.has("missing")).toBe(false);
        expect(cache.get("missing")).toBeNull();
    });

    it("should store and return inflight downloads", () => {
        const cache = makeCache(tempDir());
        const download = okAsync<void, string>(undefined);

        expect(cache.getInflight("song")).toBeNull();
        cache.setInflight("song", download);
        expect(cache.getInflight("song")).toBe(download);
    });

    it("should build cache paths in the cache directory", () => {
        const dir = tempDir();
        expect(makeCache(dir).cachePath("abc")).toBe(`${dir}/abc`);
    });
});

describe("AudioCache createStream", () => {
    afterEach(async () => {
        await Promise.all(
            dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
        );
    });

    it("should stream a cached track from its file and refresh its access time", async () => {
        const dir = tempDir();
        await fs.mkdir(dir, { recursive: true });
        await writeAged(`${dir}/song`, "cached audio", 60_000);
        const yt = fakeYtDlp();
        const cache = makeCache(dir, {}, yt.ytDlp);
        await cache.init();
        const before = (await fs.stat(`${dir}/song`)).mtimeMs;

        const { stream } = await cache.createStream("song");

        expect(await readAll(stream)).toBe("cached audio");
        expect(yt.stream).not.toHaveBeenCalled();
        await vi.waitFor(async () => {
            expect((await fs.stat(`${dir}/song`)).mtimeMs).toBeGreaterThan(before);
        });
    });

    it("should download a missing track, stream it and index it once done", async () => {
        const dir = tempDir();
        const yt = fakeYtDlp();
        const cache = makeCache(dir, {}, yt.ytDlp);
        await cache.init();

        const { stream } = await cache.createStream("song");
        const received = readAll(stream);
        const { stream: source } = yt.downloads[0];
        source.write("downloaded ");
        source.end("audio");

        expect(await received).toBe("downloaded audio");
        await cache.getInflight("song");
        expect(yt.stream).toHaveBeenCalledWith("song");
        expect(cache.has("song")).toBe(true);
        expect(await fs.readFile(`${dir}/song`, "utf-8")).toBe("downloaded audio");
        expect(cache.getInflight("song")).toBeNull();
    });

    it("should share one download between concurrent requests for the same track", async () => {
        const dir = tempDir();
        const yt = fakeYtDlp();
        const cache = makeCache(dir, {}, yt.ytDlp);
        await cache.init();

        const first = cache.createStream("song");
        const second = cache.createStream("song");
        const { stream } = await first;
        const received = readAll(stream);
        yt.downloads[0].stream.end("audio");

        // the second one waits for the download, then reads the cached file
        const { stream: secondStream } = await second;
        expect(await readAll(secondStream)).toBe("audio");
        expect(await received).toBe("audio");
        expect(yt.stream).toHaveBeenCalledTimes(1);
    });

    it("should not index a track over the max file size", async () => {
        const dir = tempDir();
        const yt = fakeYtDlp();
        const cache = makeCache(dir, { maxFileSizeBytes: 4 }, yt.ytDlp);
        await cache.init();

        const { stream } = await cache.createStream("song");
        const received = readAll(stream);
        yt.downloads[0].stream.end("0123456789");

        expect(await received).toBe("0123456789");
        await cache.getInflight("song");
        expect(cache.has("song")).toBe(false);
        expect(yt.downloads[0].kill).toHaveBeenCalled();
        await vi.waitFor(async () => {
            expect(await fs.readdir(dir)).toEqual([]);
        });
    });

    it("should remove the partial file when the download fails", async () => {
        const dir = tempDir();
        const yt = fakeYtDlp();
        const cache = makeCache(dir, {}, yt.ytDlp);
        await cache.init();

        const { stream } = await cache.createStream("song");
        stream.on("error", () => {});
        const source = yt.downloads[0].stream;
        source.write("partial");
        source.destroy(new Error("network down"));

        const res = await cache.getInflight("song");
        expect(res?.isErr()).toBe(true);
        expect(cache.has("song")).toBe(false);
        await vi.waitFor(async () => {
            expect(await fs.readdir(dir)).toEqual([]);
        });
    });

    it("should kill running downloads on abortAll", async () => {
        const dir = tempDir();
        const yt = fakeYtDlp();
        const cache = makeCache(dir, {}, yt.ytDlp);
        await cache.init();

        const { stream } = await cache.createStream("song");
        stream.on("error", () => {});
        stream.resume();
        cache.abortAll();

        expect(yt.downloads[0].kill).toHaveBeenCalledTimes(1);
        // the list was cleared, nothing to kill twice
        cache.abortAll();
        expect(yt.downloads[0].kill).toHaveBeenCalledTimes(1);
        yt.downloads[0].stream.destroy();
    });
});
