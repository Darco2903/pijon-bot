import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { PassThrough, type Readable } from "stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { teeToFile } from "../../src/music-player/teeToFile.js";
import { pathExists } from "../../src/utils.js";

let dir: string;

function collect(stream: Readable): Promise<string> {
    return new Promise((resolve) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("close", () => resolve(Buffer.concat(chunks).toString()));
        stream.on("error", () => {});
    });
}

/** Lets pending stream events and fs callbacks run */
function tick(ms = 20): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("teeToFile", () => {
    beforeEach(async () => {
        dir = path.join(os.tmpdir(), `pijon-tee-test-${randomUUID()}`);
        await fs.mkdir(dir, { recursive: true });
    });

    afterEach(async () => {
        await fs.rm(dir, { recursive: true, force: true });
    });

    it("writes the whole file and renames the .part file", async () => {
        const source = new PassThrough();
        const final = path.join(dir, "track");
        const { playerStream, done } = teeToFile(source, final);
        const played = collect(playerStream);

        source.write("hello ");
        source.end("world");

        expect((await done)._unsafeUnwrap()).toBe(true);
        expect(await played).toBe("hello world");
        expect(await fs.readFile(final, "utf-8")).toBe("hello world");
        expect(await pathExists(`${final}.part`)).toBe(false);
    });

    it("drops the file over maxBytes but keeps playing", async () => {
        const source = new PassThrough();
        const final = path.join(dir, "track");
        const { playerStream, done } = teeToFile(source, final, 5);
        const played = collect(playerStream);

        source.write("12345");
        source.write("67890");
        source.end("abc");

        expect((await done)._unsafeUnwrap()).toBe(false);
        expect(await played).toBe("1234567890abc");
        await tick();
        expect(await pathExists(final)).toBe(false);
        expect(await pathExists(`${final}.part`)).toBe(false);
    });

    it("fails and cleans up when the source errors", async () => {
        const source = new PassThrough();
        const final = path.join(dir, "track");
        const { playerStream, done } = teeToFile(source, final);
        playerStream.on("error", () => {});

        source.write("partial");
        await tick();
        source.destroy(new Error("boom"));

        expect((await done)._unsafeUnwrapErr()).toBe("teeToFile failed: boom");
        expect(playerStream.destroyed).toBe(true);
        expect(await pathExists(`${final}.part`)).toBe(false);
        expect(await pathExists(final)).toBe(false);
    });

    it("keeps downloading to the file when the player is destroyed", async () => {
        const source = new PassThrough();
        const final = path.join(dir, "track");
        const { playerStream, done } = teeToFile(source, final);

        source.write("first ");
        await tick();
        playerStream.destroy(); // skip
        source.write("second ");
        source.end("third");

        expect((await done)._unsafeUnwrap()).toBe(true);
        expect(await fs.readFile(final, "utf-8")).toBe("first second third");
    });

    it("stops the source when the player is destroyed after the file was dropped", async () => {
        const source = new PassThrough();
        const final = path.join(dir, "track");
        const { playerStream, done } = teeToFile(source, final, 5);

        source.write("1234567890");
        await tick();
        playerStream.destroy();

        expect((await done)._unsafeUnwrap()).toBe(false);
        expect(source.destroyed).toBe(true);
    });
});
