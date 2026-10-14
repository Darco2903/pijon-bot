import { describe, it, expect, vi, beforeEach } from "vitest";
import { errAsync, okAsync } from "neverthrow";

const search = vi.fn();
vi.mock("../../src/yt-dlp/index.js", () => ({
    ytDlp: { search: (...args: unknown[]) => search(...args) },
}));

const { resolveTrackId } = await import("../../src/music-player/resolve.js");

const VIDEO_ID = "dQw4w9WgXcQ";

describe("resolveTrackId", () => {
    beforeEach(() => {
        search.mockReset();
    });

    it("should return the id of a YouTube URL without searching", async () => {
        const res = await resolveTrackId(`https://www.youtube.com/watch?v=${VIDEO_ID}`);
        expect(res._unsafeUnwrap()).toBe(VIDEO_ID);
        expect(search).not.toHaveBeenCalled();
    });

    it("should return the id of a short youtu.be URL", async () => {
        const res = await resolveTrackId(`https://youtu.be/${VIDEO_ID}`);
        expect(res._unsafeUnwrap()).toBe(VIDEO_ID);
        expect(search).not.toHaveBeenCalled();
    });

    it("should return a video id as is", async () => {
        const res = await resolveTrackId(VIDEO_ID);
        expect(res._unsafeUnwrap()).toBe(VIDEO_ID);
        expect(search).not.toHaveBeenCalled();
    });

    it("should search other queries and return the first result", async () => {
        search.mockReturnValue(
            okAsync([
                { id: "first000000", title: "First" },
                { id: "second00000", title: "Second" },
            ]),
        );

        const res = await resolveTrackId("lofi hip hop");
        expect(res._unsafeUnwrap()).toBe("first000000");
        expect(search).toHaveBeenCalledWith("lofi hip hop", 1);
    });

    it("should fail with the markdown-escaped query when nothing is found", async () => {
        search.mockReturnValue(okAsync([]));

        const res = await resolveTrackId("some *weird* _song_");
        expect(res._unsafeUnwrapErr()).toBe("No results for *some \\*weird\\* \\_song\\_*.");
    });

    it("should fail with a user-facing message when the search fails", async () => {
        search.mockReturnValue(errAsync("yt-dlp failed: boom"));

        const res = await resolveTrackId("lofi hip hop");
        expect(res._unsafeUnwrapErr()).toBe("The search failed, try again.");
    });
});
