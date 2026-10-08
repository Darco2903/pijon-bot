import fs from "fs/promises";
import { createReadStream } from "fs";
import type { Readable } from "stream";
import { ResultAsync } from "neverthrow";
import { Millisecond, Second } from "@darco2903/secondthought";
import { pathExists } from "../utils.js";
import { teeToFile } from "./teeToFile.js";
import { CacheEntry, TrackStream } from "./types/index.js";
import { createPcmStream } from "./ffmpegPlayer.js";
import { YtDlp } from "../yt-dlp/yt-dlp.js";
import { logger } from "../logger.js";

export interface AudioCacheOptions {
    dir: string;
    maxSizeBytes: number; // LRU eviction above this, 0 = no limit
    maxFileSizeBytes: number; // tracks above this are streamed but not cached, 0 = no limit
    ttl: Second; // max age since last access (file mtime, refreshed on hit), 0 = no limit
    // maxTrackDurationMs?: number; // don't cache very long tracks
}

export interface PruneResult {
    removed: number;
    freedBytes: number;
    /** Cache size after pruning */
    totalBytes: number;
}

export class AudioCache {
    protected readonly ytDlp: YtDlp;
    public readonly options: AudioCacheOptions;
    protected index: Map<string, CacheEntry> = new Map();
    protected inflight: Map<string, ResultAsync<void, string>> = new Map();
    /** kill() of each running download, so shutdown doesn't wait for them to finish */
    protected downloads: Map<string, () => void> = new Map();
    /** Running prune, so overlapping calls share it */
    protected pruning: ResultAsync<PruneResult, string> | null = null;

    constructor(ytdlp: YtDlp, options: AudioCacheOptions) {
        this.ytDlp = ytdlp;
        this.options = options;
    }

    public cachePath(key: string): string {
        return `${this.options.dir}/${key}`;
    }

    init(): ResultAsync<{ entryCount: number }, string> {
        // scan dir, rebuild index, clean .part files, then prune
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
                            const path = this.cachePath(entry.name);

                            if (entry.name.endsWith(".part")) {
                                // Delete unfinished downloads
                                await fs.unlink(path).catch((err) => {
                                    logger.error(
                                        `AudioCache: failed to delete .part file ${entry.name}: ${err}`,
                                    );
                                });
                            } else {
                                // Rebuild index for valid cache files
                                const key = entry.name; // Assuming the filename is the key
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
            .andThen(() => this.prune())
            .map(() => ({ entryCount: this.index.size }))
            .andTee((res) => {
                logger.info(`AudioCache initialized with ${res.entryCount} entries.`);
            });
    }

    /**
     * Deletes the entries not accessed for ttlMs, then the least recently
     * accessed ones until the cache fits in maxSizeBytes.
     * Downloads in progress aren't in the index yet, so they are never touched.
     */
    public prune(): ResultAsync<PruneResult, string> {
        if (this.pruning) return this.pruning;

        this.pruning = ResultAsync.fromPromise(
            this.doPrune().finally(() => {
                this.pruning = null;
            }),
            (err) => `AudioCache: prune failed: ${err}`,
        ).orTee((error) => logger.error(error));
        return this.pruning;
    }

    protected async doPrune(): Promise<PruneResult> {
        const { ttl, maxSizeBytes } = this.options;
        const now = Millisecond.now();
        let removed = 0;
        let freedBytes = 0;

        const stats = await Promise.all(
            [...this.index.values()].map(async (entry) => ({
                entry,
                st: await fs.stat(entry.path).catch(() => null),
            })),
        );

        const files: { entry: CacheEntry; sizeBytes: number; lastAccessMs: number }[] = [];
        for (const { entry, st } of stats) {
            if (!st) {
                // file deleted from outside
                this.index.delete(entry.key);
            } else if (ttl.time > 0 && new Millisecond(st.mtimeMs).diff(now).greaterThan(ttl)) {
                await this.remove(entry);
                removed++;
                freedBytes += st.size;
            } else {
                files.push({ entry, sizeBytes: st.size, lastAccessMs: st.mtimeMs });
            }
        }

        let totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);
        if (maxSizeBytes > 0 && totalBytes > maxSizeBytes) {
            // least recently accessed first
            files.sort((a, b) => a.lastAccessMs - b.lastAccessMs);
            for (const f of files) {
                if (totalBytes <= maxSizeBytes) break;
                await this.remove(f.entry);
                removed++;
                freedBytes += f.sizeBytes;
                totalBytes -= f.sizeBytes;
            }
        }

        if (removed > 0) {
            logger.info(
                `AudioCache: pruned ${removed} entries (${freedBytes} bytes freed, ${totalBytes} bytes left)`,
            );
        }
        return { removed, freedBytes, totalBytes };
    }

    /** Removes from the index first, so no new stream opens the file being deleted */
    protected async remove(entry: CacheEntry): Promise<void> {
        this.index.delete(entry.key);
        await fs.unlink(entry.path).catch((err) => {
            logger.error(`AudioCache: failed to delete ${entry.key}: ${err}`);
        });
    }

    /**
     * Kills all running downloads (shutdown). Their .part files stay behind
     * and are deleted by init() on the next start.
     */
    public abortAll(): void {
        for (const [videoId, kill] of this.downloads) {
            logger.debug(`AudioCache: aborting download of ${videoId}`);
            kill();
        }
        this.downloads.clear();
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
            const now = new Date();
            fs.utimes(hit.path, now, now).catch((err) => {
                logger.error(`AudioCache: failed to update access time for ${videoId}: ${err}`);
            });
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
            const { playerStream, done } = teeToFile(
                upstream.stream,
                p,
                this.options.maxFileSizeBytes,
            );
            this.downloads.set(videoId, upstream.kill);

            done.then(() => {
                // remove inflight entry when done, whether success or failure
                this.inflight.delete(videoId);
                this.downloads.delete(videoId);
            });

            // Registered so waitFor() and dedup can await the end of the download
            this.inflight.set(
                videoId,
                done
                    .andTee((cached) => {
                        if (!cached) {
                            logger.info(
                                `AudioCache: ${videoId} is over the max file size, not cached`,
                            );
                            // the source may have been dropped mid-download
                            upstream.kill();
                            return;
                        }
                        this.index.set(videoId, { key: videoId, path: p });
                        // the cache only grows here, keep it under maxSizeBytes
                        void this.prune();
                    })
                    .map(() => undefined)
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
