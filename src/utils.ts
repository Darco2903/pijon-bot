import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { ZodError, ZodType } from "zod";
import { err, ok, Result, ResultAsync } from "neverthrow";
import type { Time } from "@darco2903/secondthought";
import { Readable } from "stream";
import { ReadableStream as WebReadableStream } from "stream/web";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const rootPath = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
export const IS_PROD = !args.includes("--dev");

export function formatLink(text: string, url: string): string {
    return `[${text}](${url})`;
}

export async function pathExists(path: string): Promise<boolean> {
    return fs.promises
        .access(path)
        .then(() => true)
        .catch(() => false);
}

function parseTime(time: number): { h: number; m: number; s: number } {
    return {
        h: ~~(time / 3600),
        m: ~~((time % 3600) / 60),
        s: ~~(time % 60),
    };
}

export function formatTime(time: number): string {
    const { h, m, s } = parseTime(time);
    return `${h > 0 ? `${h}:` : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function wait(ms: number | Time): Promise<void> {
    const msValue = typeof ms === "number" ? ms : ms.toMillisecond().time;
    return new Promise((resolve) => setTimeout(resolve, msValue));
}

export function safeFetch(input: string | URL | Request, init?: RequestInit | undefined): ResultAsync<Response, void> {
    return ResultAsync.fromPromise(
        //
        fetch(input, init),
        (error) => {
            console.error("Fetch error:", error);
        },
    );
}

export const safeJSONParse = Result.fromThrowable(
    //
    JSON.parse,
    (error) => {},
);

export function safeParse<T>(schema: ZodType<T>, data: any): Result<T, ZodError> {
    const parseResult = schema.safeParse(data);
    if (parseResult.success) {
        return ok(parseResult.data);
    } else {
        return err(parseResult.error);
    }
}

export function readableStreamToReadable<T>(stream: ReadableStream<T>): Readable {
    return Readable.fromWeb(stream as WebReadableStream<T>);
}
