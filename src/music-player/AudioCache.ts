import fs from "fs/promises";
import { createReadStream } from "fs";
import type { Readable } from "stream";
import { ResultAsync } from "neverthrow";
import { Second } from "@darco2903/secondthought";
import { pathExists } from "../utils.js";
import { teeToFile } from "./teeToFile.js";
import { CacheEntry, TrackStream } from "./types/index.js";
import { createPcmStream } from "./ffmpegPlayer.js";
import { YtDlp } from "../yt-dlp/yt-dlp.js";
import { logger } from "../logger.js";

export interface AudioCacheOptions {
    dir: string;
    maxSizeBytes: number; // LRU eviction above this
    ttlMs: number; // max age since last access
    // maxTrackDurationMs?: number; // don't cache very long tracks
}

export class AudioCache {
    protected readonly ytDlp: YtDlp;
    public readonly options: AudioCacheOptions;
    protected index: Map<string, CacheEntry> = new Map();
    protected inflight: Map<string, ResultAsync<void, string>> = new Map();

    constructor(ytdlp: YtDlp, options: AudioCacheOptions) {
        this.ytDlp = ytdlp;
        this.options = options;
    }

    public cachePath(key: string): string {
        return `${this.options.dir}/${key}`;
    }

    init(): ResultAsync<{ entryCount: number }, string> {
        // scan dir, rebuild index, clean .part files
        return ResultAsync.fromSafePromise(pathExists(this.options.dir))
            .andThen((exists) => {
                if (exists) {
                    return ResultAsync.fromPromise(
                        fs.readdir(this.options.dir, { withFileTypes: true }),
                        (err) => `Failed to read cache dir: ${err}`,
                    ).map(async (entries) => {
                        // Rebuild index from entries
                        for (const entry of entries) {
                            if (!entry.isFile()) continue;

                            if (entry.name.endsWith(".part")) {
                                // Delete .part files
                                await fs.unlink(this.cachePath(entry.name)).catch((err) => {
                                    console.error(
                                        `Failed to delete .part file ${entry.name}: ${err}`,
                                    );
                                });
                            } else {
                                // Rebuild index for valid cache files
                                const key = entry.name; // Assuming the filename is the key
                                const path = this.cachePath(entry.name);
                                // const stats = await fs.stat(path);
                                this.index.set(key, {
                                    key,
                                    path,
                                    // sizeBytes: stats.size,
                                    // lastAccessMs: Date.now(),
                                });
                            }
                        }
                        return { entryCount: this.index.size };
                    });
                } else {
                    return ResultAsync.fromPromise(
                        fs.mkdir(this.options.dir, { recursive: true }),
                        (err) => `Failed to create cache dir: ${err}`,
                    ).map(() => ({ entryCount: 0 }));
                }
            })
            .andTee((res) => {
                logger.info(`AudioCache initialized with ${res.entryCount} entries.`);
            });
    }

    public get(key: string): CacheEntry | null {
        return this.index.get(key) || null;
    }

    public has(key: string): boolean {
        return this.index.has(key);
    }

    public getInflight(key: string): ResultAsync<void, string> | null {
        return this.inflight.get(key) || null;
    }

    public setInflight(key: string, promise: ResultAsync<void, string>): void {
        this.inflight.set(key, promise);
    }

    async createStream(videoId: string, start?: Second): Promise<TrackStream> {
        let stream: Readable;
        let destroy: () => void;

        const hit = this.index.get(videoId);
        if (hit) {
            logger.debug(`AudioCache: cache hit for ${videoId}`);
            stream = createReadStream(hit.path);
            destroy = () => {};
        } else {
            const inflight = this.inflight.get(videoId);
            if (inflight) {
                logger.debug(`AudioCache: cache inflight for ${videoId}, waiting...`);
                await inflight;
                logger.debug(`AudioCache: inflight complete for ${videoId}, retrying...`);
                return this.createStream(videoId, start); // retry after inflight completes
            }

            logger.debug(`AudioCache: cache miss for ${videoId}, downloading...`);

            const p = this.cachePath(videoId);
            const upstream = this.ytDlp.stream(videoId);
            const { playerStream, done } = teeToFile(upstream.stream, p);

            done.then(() => {
                // remove inflight entry when done, whether success or failure
                this.inflight.delete(videoId);
            });

            // Registered so waitFor() and dedup can await the end of the download
            this.inflight.set(
                videoId,
                done
                    .andTee(() => {
                        this.index.set(videoId, { key: videoId, path: p });
                    })
                    .orTee(async (error) => {
                        logger.error(`AudioCache: download failed for ${videoId}: ${error}`);
                        // Clean up partial file on failure
                        await fs.unlink(p).catch(() => {});
                    }),
            );

            stream = playerStream;
            // Skip = destroy the player branch only. The download keeps going.
            destroy = () => {
                playerStream.destroy();
            };
        }

        return {
            stream: createPcmStream(stream, start),
            destroy: destroy,
        };
    }
}

// export interface CacheWriter {
//     writable: Writable;
//     commit(): Promise<CacheEntry>; // rename .part -> final
//     abort(): Promise<void>; // delete .part
// }
