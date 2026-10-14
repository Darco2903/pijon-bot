import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import type { Readable } from "stream";
import { afterEach, describe, expect, it } from "vitest";
import { YtDlp } from "../../src/yt-dlp/yt-dlp.js";

const BIN = fileURLToPath(new URL("./fixtures/fake-yt-dlp.mjs", import.meta.url));

const FAKE_VARS = [
    "FAKE_YTDLP_STDOUT",
    "FAKE_YTDLP_STDERR",
    "FAKE_YTDLP_EXIT",
    "FAKE_YTDLP_DELAY_MS",
    "FAKE_YTDLP_ARGS_FILE",
] as const;

/** The fake binary inherits process.env */
function fake(vars: Partial<Record<(typeof FAKE_VARS)[number], string | number>>): void {
    for (const [key, value] of Object.entries(vars)) process.env[key] = String(value);
}

async function argsFile(): Promise<string> {
    const file = path.join(os.tmpdir(), `pijon-ytdlp-args-${randomUUID()}.json`);
    fake({ FAKE_YTDLP_ARGS_FILE: file });
    return file;
}

async function readArgs(file: string): Promise<string[]> {
    const args = JSON.parse(await fs.readFile(file, "utf-8"));
    await fs.rm(file, { force: true });
    return args;
}

/** Resolves with the data, or the error the stream was destroyed with */
function collect(stream: Readable): Promise<{ data: string; error: Error | null }> {
    return new Promise((resolve) => {
        const chunks: Buffer[] = [];
        let error: Error | null = null;
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("error", (err) => {
            error = err;
        });
        stream.on("close", () => resolve({ data: Buffer.concat(chunks).toString(), error }));
    });
}

const INFO = { id: "dQw4w9WgXcQ", title: "Song", webpage_url: "https://youtu.be/dQw4w9WgXcQ" };

describe("YtDlp", () => {
    afterEach(() => {
        for (const key of FAKE_VARS) delete process.env[key];
    });

    describe("run", () => {
        it("returns stdout on exit 0", async () => {
            fake({ FAKE_YTDLP_STDOUT: "hello" });

            const res = await new YtDlp({ bin: BIN }).run(["x"]);
            expect(res._unsafeUnwrap()).toBe("hello");
        });

        it("keeps only the ERROR lines of stderr on failure", async () => {
            fake({
                FAKE_YTDLP_STDERR: "[youtube] progress\nERROR: first\nnoise\nERROR: second\n",
                FAKE_YTDLP_EXIT: 1,
            });

            const res = await new YtDlp({ bin: BIN }).run(["x"]);
            expect(res._unsafeUnwrapErr()).toBe("yt-dlp failed: ERROR: first\nERROR: second");
        });

        it("falls back to the whole stderr without ERROR lines", async () => {
            fake({ FAKE_YTDLP_STDERR: "something bad", FAKE_YTDLP_EXIT: 2 });

            const res = await new YtDlp({ bin: BIN }).run(["x"]);
            expect(res._unsafeUnwrapErr()).toBe("yt-dlp failed: something bad");
        });

        it("falls back to the exit code without stderr", async () => {
            fake({ FAKE_YTDLP_EXIT: 3 });

            const res = await new YtDlp({ bin: BIN }).run(["x"]);
            expect(res._unsafeUnwrapErr()).toBe("yt-dlp failed: yt-dlp exited with code 3");
        });

        it("times out and kills the process", async () => {
            fake({ FAKE_YTDLP_DELAY_MS: 10_000 });

            const start = Date.now();
            const res = await new YtDlp({ bin: BIN, timeout: 200 }).run(["x"]);
            expect(res._unsafeUnwrapErr()).toBe("yt-dlp failed: yt-dlp timed out after 200ms");
            expect(Date.now() - start).toBeLessThan(5_000);
        });

        it("reports a missing binary", async () => {
            const res = await new YtDlp({ bin: path.join(os.tmpdir(), randomUUID()) }).run(["x"]);
            expect(res._unsafeUnwrapErr()).toMatch(/^yt-dlp failed: .*ENOENT/);
        });

        it("passes the common and extra arguments", async () => {
            const file = await argsFile();

            await new YtDlp({ bin: BIN, extraArgs: ["--cookies", "c.txt"] }).run(["-J", "url"]);
            expect(await readArgs(file)).toEqual([
                "--no-warnings",
                "--js-runtimes",
                `node:${process.execPath}`,
                "--cookies",
                "c.txt",
                "-J",
                "url",
            ]);
        });
    });

    describe("getInfo", () => {
        it("parses the video info", async () => {
            fake({ FAKE_YTDLP_STDOUT: JSON.stringify({ ...INFO, duration: 212, extra: true }) });

            const res = await new YtDlp({ bin: BIN }).getInfo(INFO.id);
            expect(res._unsafeUnwrap()).toEqual({ ...INFO, duration: 212 });
        });

        it("rejects output that isn't JSON", async () => {
            fake({ FAKE_YTDLP_STDOUT: "not json" });

            const res = await new YtDlp({ bin: BIN }).getInfo(INFO.id);
            expect(res._unsafeUnwrapErr()).toMatch(/^Invalid yt-dlp JSON output/);
        });

        it("rejects JSON that doesn't match the schema", async () => {
            fake({ FAKE_YTDLP_STDOUT: JSON.stringify({ id: 1 }) });

            const res = await new YtDlp({ bin: BIN }).getInfo(INFO.id);
            expect(res._unsafeUnwrapErr()).toMatch(/^Unexpected yt-dlp output/);
        });

        it("asks for a single video", async () => {
            fake({ FAKE_YTDLP_STDOUT: JSON.stringify(INFO) });
            const file = await argsFile();

            await new YtDlp({ bin: BIN }).getInfo("some-url");
            expect((await readArgs(file)).slice(3)).toEqual([
                "-J",
                "--no-playlist",
                "--",
                "some-url",
            ]);
        });
    });

    describe("search", () => {
        it("searches with the limit and returns the entries", async () => {
            const entries = [
                { id: "a", title: "A" },
                { id: "b", title: "B", duration: 10, channel: "C" },
            ];
            fake({ FAKE_YTDLP_STDOUT: JSON.stringify({ entries }) });
            const file = await argsFile();

            const res = await new YtDlp({ bin: BIN }).search("lofi beats", 3);
            expect(res._unsafeUnwrap()).toEqual(entries);
            expect((await readArgs(file)).slice(3)).toEqual([
                "-J",
                "--flat-playlist",
                "--",
                "ytsearch3:lofi beats",
            ]);
        });
    });

    describe("stream", () => {
        it("ends normally on exit 0", async () => {
            fake({ FAKE_YTDLP_STDOUT: "audio-bytes" });

            const { stream } = new YtDlp({ bin: BIN }).stream("url");
            const { data, error } = await collect(stream);
            expect(error).toBeNull();
            expect(data).toBe("audio-bytes");
        });

        it("ends with an error on a non-zero exit", async () => {
            fake({
                FAKE_YTDLP_STDOUT: "partial",
                FAKE_YTDLP_STDERR: "ERROR: boom",
                FAKE_YTDLP_EXIT: 1,
            });

            const { stream } = new YtDlp({ bin: BIN }).stream("url");
            const { error } = await collect(stream);
            expect(error?.message).toBe("ERROR: boom");
        });

        it("kill() ends the stream without an error", async () => {
            fake({ FAKE_YTDLP_DELAY_MS: 10_000 });

            const { stream, kill } = new YtDlp({ bin: BIN }).stream("url");
            const result = collect(stream);
            kill();
            const { error } = await result;
            expect(error).toBeNull();
            expect(stream.destroyed).toBe(true);
        });

        it("passes the format and output arguments", async () => {
            const file = await argsFile();

            const { stream } = new YtDlp({ bin: BIN }).stream("url", "bestaudio");
            await collect(stream);
            expect((await readArgs(file)).slice(3)).toEqual([
                "-f",
                "bestaudio",
                "--no-playlist",
                "--no-progress",
                "-o",
                "-",
                "--",
                "url",
            ]);
        });
    });
});
