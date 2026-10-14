import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { ReadableStream } from "stream/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import z, { ZodError } from "zod";
import { Second } from "@darco2903/secondthought";
import {
    formatLink,
    formatTime,
    pathExists,
    readableStreamToReadable,
    safeJSONParse,
    safeParse,
    wait,
} from "../../src/utils.js";

describe("formatTime", () => {
    it("formats zero", () => {
        expect(formatTime(0)).toBe("00:00");
    });

    it("pads minutes and seconds", () => {
        expect(formatTime(65)).toBe("01:05");
    });

    it("adds hours only when needed", () => {
        expect(formatTime(3661)).toBe("1:01:01");
    });

    it("drops fractional seconds", () => {
        expect(formatTime(59.9)).toBe("00:59");
    });
});

describe("formatLink", () => {
    it("builds a markdown link", () => {
        expect(formatLink("text", "https://example.com")).toBe("[text](https://example.com)");
    });
});

describe("pathExists", () => {
    it("is true for an existing path", async () => {
        expect(await pathExists(os.tmpdir())).toBe(true);
    });

    it("is false for a missing path", async () => {
        expect(await pathExists(path.join(os.tmpdir(), randomUUID()))).toBe(false);
    });
});

describe("wait", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("waits a number of milliseconds", async () => {
        vi.useFakeTimers();
        let done = false;
        const p = wait(1000).then(() => {
            done = true;
        });

        await vi.advanceTimersByTimeAsync(999);
        expect(done).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await p;
        expect(done).toBe(true);
    });

    it("accepts a Time value", async () => {
        vi.useFakeTimers();
        let done = false;
        const p = wait(new Second(2)).then(() => {
            done = true;
        });

        await vi.advanceTimersByTimeAsync(1999);
        expect(done).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await p;
        expect(done).toBe(true);
    });
});

describe("safeJSONParse", () => {
    it("returns the parsed value", () => {
        const res = safeJSONParse('{"a":1}');
        expect(res.isOk()).toBe(true);
        expect(res._unsafeUnwrap()).toEqual({ a: 1 });
    });

    it("returns an error on invalid JSON", () => {
        expect(safeJSONParse("{nope").isErr()).toBe(true);
    });
});

describe("safeParse", () => {
    const schema = z.object({ a: z.number() });

    it("returns the data when valid", () => {
        const res = safeParse(schema, { a: 1 });
        expect(res._unsafeUnwrap()).toEqual({ a: 1 });
    });

    it("returns the ZodError when invalid", () => {
        const res = safeParse(schema, { a: "x" });
        expect(res.isErr()).toBe(true);
        expect(res._unsafeUnwrapErr()).toBeInstanceOf(ZodError);
    });
});

describe("readableStreamToReadable", () => {
    it("gives back the same data", async () => {
        const web = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(Buffer.from("hello "));
                controller.enqueue(Buffer.from("world"));
                controller.close();
            },
        });

        const chunks: Buffer[] = [];
        for await (const chunk of readableStreamToReadable(web as any)) {
            chunks.push(Buffer.from(chunk));
        }
        expect(Buffer.concat(chunks).toString()).toBe("hello world");
    });
});
