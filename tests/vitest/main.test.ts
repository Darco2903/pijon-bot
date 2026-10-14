import { beforeEach, describe, expect, it, vi } from "vitest";
import { errAsync, okAsync } from "neverthrow";

vi.mock("../../src/yt-dlp/index.js", () => ({ ytDlp: { update: vi.fn() } }));
vi.mock("../../src/music-player/index.js", () => ({ audioCache: { init: vi.fn() } }));

const { ytDlp } = await import("../../src/yt-dlp/index.js");
const { audioCache } = await import("../../src/music-player/index.js");
const { main } = await import("../../src/main.js");

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ytDlp.update).mockReturnValue(okAsync("yt-dlp is up to date"));
    vi.mocked(audioCache.init).mockReturnValue(okAsync({ entryCount: 3 }));
});

describe("main", () => {
    it("updates yt-dlp and initializes the audio cache", async () => {
        const res = await main();

        expect(res.isOk()).toBe(true);
        expect(res._unsafeUnwrap()).toBeUndefined();
        expect(ytDlp.update).toHaveBeenCalledTimes(1);
        expect(audioCache.init).toHaveBeenCalledTimes(1);
    });

    it("fails when the yt-dlp update fails", async () => {
        vi.mocked(ytDlp.update).mockReturnValue(errAsync("yt-dlp failed: offline"));

        const res = await main();

        expect(res._unsafeUnwrapErr()).toBe("yt-dlp failed: offline");
    });

    it("fails when the audio cache can't be initialized", async () => {
        vi.mocked(audioCache.init).mockReturnValue(errAsync("Failed to create cache dir"));

        const res = await main();

        expect(res._unsafeUnwrapErr()).toBe("Failed to create cache dir");
    });
});
