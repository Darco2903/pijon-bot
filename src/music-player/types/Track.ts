import z from "zod";
import { EmbedBuilder } from "discord.js";
import { formatTime } from "../../utils.js";

export const ITrackSchema = z.object({
    id: z.string(),
    title: z.string(),
    webpage_url: z.string(),
    duration: z.number().optional().nullable(),
    channel: z.string().optional().nullable(),
    uploader: z.string().optional().nullable(),
    thumbnail: z.string().optional().nullable(),
    is_live: z.boolean().optional().nullable(),
});

export type ITrack = z.infer<typeof ITrackSchema>;

export class Track implements ITrack {
    public readonly id: string;
    public readonly title: string;
    public readonly webpage_url: string;
    public readonly duration?: number | null | undefined;
    public readonly channel?: string | null | undefined;
    public readonly uploader?: string | null | undefined;
    public readonly thumbnail?: string | null | undefined;
    public readonly is_live?: boolean | null | undefined;

    constructor(track: ITrack) {
        this.id = track.id;
        this.title = track.title;
        this.webpage_url = track.webpage_url;
        this.duration = track.duration ?? null;
        this.channel = track.channel ?? null;
        this.uploader = track.uploader ?? null;
        this.thumbnail = track.thumbnail ?? null;
        this.is_live = track.is_live ?? null;
    }

    public getUrl(): string {
        return `https://youtu.be/${this.id}`;
    }

    public getImage(): string {
        return `https://img.youtube.com/vi/${this.id}/maxresdefault.jpg`;
    }

    public display(): string {
        return this.title.toLowerCase().includes((this.channel ?? "").toLowerCase()) ?
                this.title
            :   `${this.title} - ${this.channel}`;
    }

    /**
     * @description Get the song duration in a readable format
     */
    public getFormattedDuration(): string {
        return this.duration ? formatTime(this.duration) : "Unknown";
    }

    public embed(): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle(this.display())
            .setColor("Blurple")
            .setImage(this.thumbnail ?? this.getImage())
            .setURL(this.getUrl())
            .addFields(
                { name: "Title", value: this.title },
                { name: "Channel", value: this.channel ?? "Unknown" },
                { name: "Duration", value: this.getFormattedDuration() },
            );
    }
}
