import { createWriteStream } from "fs";
import { rename, unlink } from "fs/promises";
import { PassThrough, Readable } from "stream";
import { logger } from "../logger.js";
import { ResultAsync } from "neverthrow";

interface TeeResult {
    playerStream: Readable; // goes to Discord
    /**
     * true once the file is committed, false if it went over maxBytes
     * (the file is dropped, the player branch keeps going)
     */
    done: ResultAsync<boolean, string>;
}

/** maxBytes = 0 means no limit */
export function teeToFile(source: Readable, finalPath: string, maxBytes = 0): TeeResult {
    const partPath = `${finalPath}.part`;
    const file = createWriteStream(partPath);

    // Big buffer so the player branch never slows down the download
    const playerStream = new PassThrough({ highWaterMark: 8 * 1024 * 1024 });

    const done = ResultAsync.fromPromise(
        new Promise<boolean>((resolve, reject) => {
            let written = 0;
            let tooBig = false;

            // Unlink only once closed: a file still being opened would be created again afterwards
            const closeFile = () =>
                new Promise<void>((resolveClose) => {
                    if (file.closed) return resolveClose();
                    file.once("close", () => resolveClose());
                    file.destroy();
                });

            const fail = async (err: Error) => {
                source.destroy();
                playerStream.destroy(err);
                await closeFile();
                await unlink(partPath).catch(() => {});
                reject(err);
            };

            // Drop the file branch. The player branch alone no longer throttles the source.
            const dropFile = () => {
                tooBig = true;
                logger.debug(`teeToFile: ${finalPath} is over ${maxBytes} bytes, not caching it`);
                file.once("close", () => unlink(partPath).catch(() => {}));
                file.destroy();
                source.resume(); // in case it was waiting for a drain that won't come
                if (playerStream.destroyed) stop();
            };

            // Nobody needs the data anymore
            const stop = () => {
                source.destroy();
                resolve(false);
            };

            // Skipped while the file branch is already gone
            playerStream.on("close", () => {
                if (tooBig) stop();
            });

            source.on("data", (chunk: Buffer) => {
                // Branch 1: file. The only branch allowed to throttle the source.
                if (!tooBig) {
                    written += chunk.length;
                    if (maxBytes > 0 && written > maxBytes) {
                        dropFile();
                    } else if (!file.write(chunk)) {
                        source.pause();
                        file.once("drain", () => source.resume());
                    }
                }

                // Branch 2: player. write() return value is ignored on purpose,
                // so data piles up in RAM instead of slowing the download.
                if (!playerStream.destroyed) {
                    playerStream.write(chunk);
                }
            });

            source.on("end", () => {
                playerStream.end();
                if (tooBig) {
                    resolve(false);
                } else {
                    file.end(); // triggers "finish" once everything is flushed
                }
            });

            file.on("finish", async () => {
                logger.debug(`teeToFile: finished writing ${partPath}, renaming to ${finalPath}`);
                await rename(partPath, finalPath); // .part -> final, atomic
                resolve(true);
            });

            source.on("error", fail);
            file.on("error", (err) => {
                // destroying the file with a pending write errors, expected once dropped
                if (!tooBig) void fail(err);
            });
        }),
        (err) => `teeToFile failed: ${err instanceof Error ? err.message : String(err)}`,
    );

    return { playerStream, done };
}
