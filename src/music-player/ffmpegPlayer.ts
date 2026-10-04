import { spawn } from "child_process";
import { pipeline, type Readable } from "stream";

/**
 * Decodes any input to raw PCM (s16le, 48kHz, stereo) for StreamType.Raw.
 * - Readable input: seek is an output option (decode then discard).
 * - File path input: seek is an input option (near-instant).
 * @param input - Readable stream or file path to decode
 * @param start - Time offset in seconds to start the stream from
 */
export function createPcmStream(input: Readable | string, start = 0): Readable {
    const isFile = typeof input === "string";
    const ss = start > 0 ? ["-ss", start.toFixed(3)] : [];

    const args = [
        "-hide_banner",
        "-loglevel",
        "error",
        ...(isFile ? [...ss, "-i", input] : ["-i", "pipe:0", ...ss]),
        "-f",
        "s16le",
        "-ar",
        "48000",
        "-ac",
        "2",
        "pipe:1",
    ];

    const ff = spawn("ffmpeg", args, {
        stdio: [isFile ? "ignore" : "pipe", "pipe", "pipe"],
    });
    const out = ff.stdout!;
    let disposed = false;

    const dispose = () => {
        if (disposed) return;
        disposed = true;
        if (typeof input !== "string") input.destroy();
        if (ff.exitCode === null) ff.kill("SIGKILL");
    };

    ff.stderr!.on("data", (d) => {
        // After destroy(), broken pipe complaints are expected noise
        if (disposed || out.destroyed) return;
        console.error("[ffmpeg]", d.toString().trim());
    });

    ff.on("error", (err) => out.destroy(err)); // spawn failure (ffmpeg not found)

    if (!isFile) {
        pipeline(input, ff.stdin!, (err) => {
            // Real input failure only: skip/seek/stop already destroyed out
            if (err && !disposed && !out.destroyed) out.destroy(err);
        });
    }

    out.once("close", dispose); // skip, seek, stop or normal end
    return out;
}

// /**
//  * Creates a stream that starts at the given time offset (in milliseconds).
//  * - Readable input: seek is an output option (decode then discard).
//  * - File path input: seek is an input option (near-instant).
//  * @param input - Readable stream or file path to seek within
//  * @param start - Time offset in seconds to start the stream from
//  */
// export function createSeekStream(input: Readable | string, start = 0): Readable {
//     console.log(
//         `createSeekStream: start=${start}, input=${typeof input === "string" ? input : "stream"}`,
//     );
//     const isFile = typeof input === "string";
//     const ss = start > 0 ? ["-ss", start.toFixed(3)] : [];

//     const args = [
//         "-hide_banner",
//         "-loglevel",
//         "error",
//         ...(isFile ? [...ss, "-i", input] : ["-i", "pipe:0", ...ss]),
//         "pipe:1",
//     ];

//     const ff = spawn("ffmpeg", args, {
//         stdio: [isFile ? "ignore" : "pipe", "pipe", "pipe"],
//     });
//     const out = ff.stdout!;
//     let disposed = false;

//     const dispose = () => {
//         if (disposed) return;
//         disposed = true;
//         if (typeof input !== "string") input.destroy();
//         if (ff.exitCode === null) ff.kill("SIGKILL");
//     };

//     ff.stderr!.on("data", (d) => {
//         // After destroy(), broken pipe complaints are expected noise
//         if (disposed || out.destroyed) return;
//         console.error("[ffmpeg]", d.toString().trim());
//     });

//     ff.on("error", (err) => out.destroy(err)); // spawn failure (ffmpeg not found)

//     if (!isFile) {
//         pipeline(input, ff.stdin!, (err) => {
//             // Real input failure only: skip/seek/stop already destroyed out
//             if (err && !disposed && !out.destroyed) out.destroy(err);
//         });
//     }

//     out.once("close", dispose); // skip, seek, stop or normal end
//     return out;
// }
