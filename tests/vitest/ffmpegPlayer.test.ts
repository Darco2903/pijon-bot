import { EventEmitter } from "events";
import { PassThrough } from "stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Second } from "@darco2903/secondthought";

class FakeFfmpeg extends EventEmitter {
    stdin = new PassThrough();
    stdout = new PassThrough();
    stderr = new PassThrough();
    exitCode: number | null = null;
    kill = vi.fn();
}

const spawned = vi.hoisted(() => ({ calls: [] as { args: string[]; options: any; child: any }[] }));

vi.mock("child_process", () => ({
    spawn: vi.fn((_bin: string, args: string[], options: any) => {
        const child = new FakeFfmpeg();
        spawned.calls.push({ args, options, child });
        return child;
    }),
}));

const { createPcmStream } = await import("../../src/music-player/ffmpegPlayer.js");

function lastSpawn() {
    return spawned.calls[spawned.calls.length - 1];
}

function tick(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
}

describe("createPcmStream", () => {
    beforeEach(() => {
        spawned.calls.length = 0;
    });

    it("seeks after the input for a stream", () => {
        createPcmStream(new PassThrough(), new Second(5));

        const { args, options } = lastSpawn();
        const i = args.indexOf("-i");
        expect(args.slice(i, i + 4)).toEqual(["-i", "pipe:0", "-ss", "5.000"]);
        expect(options.stdio[0]).toBe("pipe");
    });

    it("seeks before the input for a file and ignores stdin", () => {
        createPcmStream("/cache/track", new Second(2.5));

        const { args, options } = lastSpawn();
        const ss = args.indexOf("-ss");
        expect(args.slice(ss, ss + 4)).toEqual(["-ss", "2.500", "-i", "/cache/track"]);
        expect(options.stdio[0]).toBe("ignore");
    });

    it("doesn't seek from the start", () => {
        createPcmStream(new PassThrough());
        expect(lastSpawn().args).not.toContain("-ss");

        createPcmStream("/cache/track", new Second(0));
        expect(lastSpawn().args).not.toContain("-ss");
    });

    it("outputs 48kHz stereo s16le PCM", () => {
        createPcmStream("/cache/track");

        const args = lastSpawn().args;
        expect(args.slice(-7)).toEqual(["-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"]);
    });

    it("kills ffmpeg and destroys the input when the output closes", async () => {
        const input = new PassThrough();
        const out = createPcmStream(input);
        const { child } = lastSpawn();

        out.destroy();
        await tick();

        expect(child.kill).toHaveBeenCalledWith("SIGKILL");
        expect(input.destroyed).toBe(true);
    });

    it("doesn't kill ffmpeg once it has exited", async () => {
        const out = createPcmStream("/cache/track");
        const { child } = lastSpawn();
        child.exitCode = 0;

        out.destroy();
        await tick();

        expect(child.kill).not.toHaveBeenCalled();
    });

    it("destroys the output when ffmpeg can't start", async () => {
        const out = createPcmStream("/cache/track");
        const errors: Error[] = [];
        out.on("error", (err) => errors.push(err));

        lastSpawn().child.emit("error", new Error("spawn ffmpeg ENOENT"));
        await tick();

        expect(out.destroyed).toBe(true);
        expect(errors[0]?.message).toBe("spawn ffmpeg ENOENT");
    });

    it("destroys the output when the input fails", async () => {
        const input = new PassThrough();
        const out = createPcmStream(input);
        const errors: Error[] = [];
        out.on("error", (err) => errors.push(err));

        input.destroy(new Error("download failed"));
        await tick();

        expect(out.destroyed).toBe(true);
        expect(errors[0]?.message).toBe("download failed");
    });
});
