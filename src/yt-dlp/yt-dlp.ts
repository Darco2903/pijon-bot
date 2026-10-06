import z from "zod";
import { spawn } from "child_process";
import { PassThrough, type Readable } from "stream";
import { err, ok, Result, ResultAsync } from "neverthrow";
import ytdl from "ytdl-core";
import { logger } from "../logger.js";

export const validateID = ytdl.validateID;
export const validateURL = ytdl.validateURL;
export const extractVideoId = ytdl.getURLVideoID;
export const getVideoID = ytdl.getVideoID;

export type YtDlpOptions = {
    /** Path to the yt-dlp executable. */
    bin?: string;
    /** Extra arguments passed to every yt-dlp invocation (e.g. cookies, proxy). */
    extraArgs?: string[];
    /** Timeout for buffered commands (info, search), in milliseconds. */
    timeout?: number;
};

export type YtDlpStream = {
    /** yt-dlp stdout. Destroyed with an error if yt-dlp exits non-zero. */
    stream: Readable;
    /** Stops the download. */
    kill: () => void;
};

const videoInfoSchema = z.object({
    id: z.string(),
    title: z.string(),
    webpage_url: z.string(),
    duration: z.number().nullish(),
    channel: z.string().nullish(),
    uploader: z.string().nullish(),
    thumbnail: z.string().nullish(),
    is_live: z.boolean().nullish(),
});

const searchResultSchema = z.object({
    entries: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            // url: z.string(),
            duration: z.number().nullish(),
            channel: z.string().nullish(),
        }),
    ),
});

export type VideoInfo = z.infer<typeof videoInfoSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>["entries"][number];

/** Keep only the end of stderr so a chatty process can't grow memory unbounded. */
const STDERR_LIMIT = 4096;

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export class YtDlp {
    protected readonly bin: string;
    protected readonly extraArgs: string[];
    protected readonly timeout: number;

    constructor(options: YtDlpOptions = {}) {
        this.bin = options.bin ?? "yt-dlp";
        this.extraArgs = options.extraArgs ?? [];
        this.timeout = options.timeout ?? 30_000;
    }

    protected spawn(args: string[]) {
        const child = spawn(
            this.bin,
            [
                "--no-warnings",
                // YouTube needs a JS runtime and yt-dlp only enables deno by default, so reuse our own node.
                "--js-runtimes",
                `node:${process.execPath}`,
                ...this.extraArgs,
                ...args,
            ],
            // detached puts yt-dlp in its own process group, so kill() also stops any ffmpeg it started.
            { stdio: ["ignore", "pipe", "pipe"], detached: true },
        );

        let stderr = "";
        child.stderr.setEncoding("utf-8");
        child.stderr.on("data", (chunk: string) => {
            stderr = (stderr + chunk).slice(-STDERR_LIMIT);
        });

        let killed = false;
        const kill = () => {
            if (killed) return;
            killed = true;
            if (child.pid === undefined || child.exitCode !== null) return;
            try {
                process.kill(-child.pid, "SIGTERM");
            } catch {
                // Already exited.
            }
        };

        // Prefer the ERROR lines over the progress chatter that precedes them.
        const errors = () => {
            const lines = stderr.trim().split("\n");
            const errorLines = lines.filter((line) => line.startsWith("ERROR:"));
            return (errorLines.length > 0 ? errorLines : lines).join("\n");
        };

        return { child, kill, stderr: errors };
    }

    /** Runs yt-dlp and buffers stdout. */
    run(args: string[]): ResultAsync<string, string> {
        return ResultAsync.fromPromise(
            new Promise<string>((resolve, reject) => {
                const { child, kill, stderr } = this.spawn(args);
                const chunks: Buffer[] = [];
                const timer = setTimeout(() => {
                    kill();
                    reject(new Error(`yt-dlp timed out after ${this.timeout}ms`));
                }, this.timeout);

                child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
                child.on("error", (error) => {
                    clearTimeout(timer);
                    reject(error);
                });
                child.on("close", (code) => {
                    clearTimeout(timer);
                    if (code === 0) {
                        resolve(Buffer.concat(chunks).toString("utf-8"));
                    } else {
                        reject(new Error(stderr() || `yt-dlp exited with code ${code}`));
                    }
                });
            }),
            (error) => `yt-dlp failed: ${errorMessage(error)}`,
        );
    }

    protected runJson<T>(args: string[], schema: z.ZodType<T>): ResultAsync<T, string> {
        return this.run(args).andThen((stdout) =>
            Result.fromThrowable(
                () => JSON.parse(stdout) as unknown,
                (error) => `Invalid yt-dlp JSON output: ${errorMessage(error)}`,
            )().andThen((json) => {
                const parsed = schema.safeParse(json);
                return parsed.success ?
                        ok(parsed.data)
                    :   err(`Unexpected yt-dlp output: ${parsed.error.message}`);
            }),
        );
    }

    /** Fetches metadata for a single video. */
    getInfo(url: string): ResultAsync<VideoInfo, string> {
        return this.runJson(["-J", "--no-playlist", "--", url], videoInfoSchema);
    }

    /** Searches YouTube and returns up to `limit` results. */
    search(query: string, limit = 5): ResultAsync<SearchResult[], string> {
        return this.runJson(
            ["-J", "--flat-playlist", "--", `ytsearch${limit}:${query}`],
            searchResultSchema,
        ).map((result) => result.entries);
    }

    /**
     * Streams the media of `url` to stdout. The caller must call `kill()` when it
     * stops consuming the stream, otherwise yt-dlp keeps downloading.
     */
    stream(url: string, format = "bestaudio/best"): YtDlpStream {
        const { child, kill, stderr } = this.spawn([
            "-f",
            format,
            "--no-playlist",
            "--no-progress",
            "-o",
            "-",
            "--",
            url,
        ]);
        // stdout ends before the exit code is known, so only end the stream once it is.
        // Otherwise a failed download would look like an empty but successful one.
        const stream = new PassThrough();
        child.stdout.pipe(stream, { end: false });
        let stopped = false;

        child.on("error", (error) => stream.destroy(error));
        child.on("close", (code) => {
            if (stream.destroyed) return;
            // A non-zero exit after kill() is expected, not an error.
            if (code === 0 || stopped) {
                stream.end();
            } else {
                stream.destroy(new Error(stderr() || `yt-dlp exited with code ${code}`));
            }
        });

        return {
            stream,
            kill: () => {
                stopped = true;
                kill();
                stream.destroy();
            },
        };
    }

    public update(): ResultAsync<string, string> {
        return this.run(["-U"])
            .andTee((result) => {
                logger.info("yt-dlp update:");
                logger.info(result);
            })
            .orTee((err) => {
                logger.error("Failed to update yt-dlp");
                logger.error(err);
            });
    }
}
