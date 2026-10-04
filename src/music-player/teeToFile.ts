import { createWriteStream } from "fs";
import { rename, unlink } from "fs/promises";
import { PassThrough, Readable } from "stream";
import { logger } from "../logger.js";
import { ResultAsync } from "neverthrow";

interface TeeResult {
    playerStream: Readable; // goes to Discord
    done: ResultAsync<void, string>; // resolves once the file is committed
}

export function teeToFile(source: Readable, finalPath: string): TeeResult {
    const partPath = `${finalPath}.part`;
    const file = createWriteStream(partPath);

    // Big buffer so the player branch never slows down the download
    const playerStream = new PassThrough({ highWaterMark: 8 * 1024 * 1024 });

    const done = ResultAsync.fromPromise(
        new Promise<void>((resolve, reject) => {
            const fail = async (err: Error) => {
                source.destroy();
                file.destroy();
                playerStream.destroy(err);
                await unlink(partPath).catch(() => {});
                reject(err);
            };

            source.on("data", (chunk: Buffer) => {
                // Branch 1: file. The only branch allowed to throttle the source.
                if (!file.write(chunk)) {
                    source.pause();
                    file.once("drain", () => source.resume());
                }

                // Branch 2: player. write() return value is ignored on purpose,
                // so data piles up in RAM instead of slowing the download.
                if (!playerStream.destroyed) {
                    playerStream.write(chunk);
                }
            });

            source.on("end", () => {
                playerStream.end();
                file.end(); // triggers "finish" once everything is flushed
            });

            file.on("finish", async () => {
                logger.debug(`teeToFile: finished writing ${partPath}, renaming to ${finalPath}`);
                await rename(partPath, finalPath); // .part -> final, atomic
                resolve();
            });

            source.on("error", fail);
            file.on("error", fail);
        }),
        (err) => `teeToFile failed: ${err instanceof Error ? err.message : String(err)}`,
    );

    // const done = ResultAsync.fromPromise(
    //     new Promise<void>((resolve, reject) => {
    //         reject(new Error("teeToFile is not implemented yet"));
    //     }),
    //     (err) => `teeToFile failed: ${err instanceof Error ? err.message : String(err)}`,
    // );

    return { playerStream, done };
}
