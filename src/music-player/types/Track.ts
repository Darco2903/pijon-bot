import { EmbedBuilder } from "discord.js";
import { formatTime } from "../../utils.js";

export interface ITrack {
    id: string;
    title: string;
    webpage_url: string;
    duration?: number | null | undefined;
    channel?: string | null | undefined;
    uploader?: string | null | undefined;
    thumbnail?: string | null | undefined;
    is_live?: boolean | null | undefined;
}

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
