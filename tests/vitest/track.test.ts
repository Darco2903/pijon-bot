import { describe, expect, it } from "vitest";
import { Track, type ITrack } from "../../src/music-player/types/Track.js";
import { QueueDataSchema, QueueItemSchema } from "../../src/music-player/types/Queue.js";

const BASE: ITrack = {
    id: "dQw4w9WgXcQ",
    title: "Never Gonna Give You Up",
    webpage_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
};

describe("Track", () => {
    it("turns missing optional fields into null", () => {
        const track = new Track(BASE);
        expect(track.duration).toBeNull();
        expect(track.channel).toBeNull();
        expect(track.uploader).toBeNull();
        expect(track.thumbnail).toBeNull();
        expect(track.is_live).toBeNull();
    });

    it("builds the short URL and the thumbnail URL", () => {
        const track = new Track(BASE);
        expect(track.getUrl()).toBe("https://youtu.be/dQw4w9WgXcQ");
        expect(track.getImage()).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg");
    });

    describe("display", () => {
        it("shows the title alone when it already contains the channel", () => {
            const track = new Track({
                ...BASE,
                title: "Rick Astley - Never Gonna",
                channel: "rick astley",
            });
            expect(track.display()).toBe("Rick Astley - Never Gonna");
        });

        it("appends the channel otherwise", () => {
            const track = new Track({ ...BASE, title: "Never Gonna", channel: "Rick Astley" });
            expect(track.display()).toBe("Never Gonna - Rick Astley");
        });

        it("shows the title alone without a channel", () => {
            expect(new Track(BASE).display()).toBe(BASE.title);
        });
    });

    describe("getFormattedDuration", () => {
        it("formats the duration", () => {
            expect(new Track({ ...BASE, duration: 212 }).getFormattedDuration()).toBe("03:32");
        });

        it("is Unknown without a duration", () => {
            expect(new Track(BASE).getFormattedDuration()).toBe("Unknown");
        });
    });

    describe("embed", () => {
        it("shows the status, title, link, channel and duration", () => {
            const embed = new Track({
                ...BASE,
                channel: "Rick Astley",
                duration: 212,
                thumbnail: "https://thumb/1.jpg",
            })
                .embed("Now playing")
                .toJSON();

            expect(embed.author?.name).toBe("Now playing");
            expect(embed.title).toBe(BASE.title);
            expect(embed.url).toBe("https://youtu.be/dQw4w9WgXcQ");
            expect(embed.thumbnail?.url).toBe("https://thumb/1.jpg");
            expect(embed.fields).toEqual([
                { name: "Channel", value: "Rick Astley", inline: true },
                { name: "Duration", value: "03:32", inline: true },
            ]);
        });

        it("falls back to Unknown channel and the YouTube thumbnail", () => {
            const embed = new Track(BASE).embed("Now playing").toJSON();
            expect(embed.fields?.[0].value).toBe("Unknown");
            expect(embed.thumbnail?.url).toBe(new Track(BASE).getImage());
        });

        it("shows Live for live streams", () => {
            const embed = new Track({ ...BASE, is_live: true, duration: 212 })
                .embed("Now playing")
                .toJSON();
            expect(embed.fields?.[1].value).toBe("🔴 Live");
        });
    });
});

describe("Queue schemas", () => {
    const item = {
        guildId: "g",
        channelId: "c",
        playlist: [BASE],
        position: 0,
        time: 1500,
        paused: false,
    };

    it("accepts a valid queue item", () => {
        expect(QueueItemSchema.safeParse(item).success).toBe(true);
    });

    it("rejects an empty playlist", () => {
        expect(QueueItemSchema.safeParse({ ...item, playlist: [] }).success).toBe(false);
    });

    it("rejects a negative or fractional position", () => {
        expect(QueueItemSchema.safeParse({ ...item, position: -1 }).success).toBe(false);
        expect(QueueItemSchema.safeParse({ ...item, position: 1.5 }).success).toBe(false);
    });

    it("rejects a negative time", () => {
        expect(QueueItemSchema.safeParse({ ...item, time: -1 }).success).toBe(false);
    });

    it("accepts valid save data", () => {
        expect(QueueDataSchema.safeParse({ items: [item], savedAt: Date.now() }).success).toBe(
            true,
        );
        expect(QueueDataSchema.safeParse({ items: [], savedAt: 0 }).success).toBe(true);
    });

    it("rejects save data without savedAt", () => {
        expect(QueueDataSchema.safeParse({ items: [item] }).success).toBe(false);
    });
});
