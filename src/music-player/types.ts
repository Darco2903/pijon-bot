export interface Track {
    id: string;
    title: string;
    url: string;
    durationMs: number | null; // null = live
    thumbnail?: string;
}

export type LoopMode = "off" | "track" | "queue";

export type PlayerStatus = "idle" | "buffering" | "playing" | "paused";

export interface PlayerEvents {
    trackStart: (track: Track) => void;
    trackEnd: (track: Track, reason: TrackEndReason) => void;
    queueEmpty: () => void;
    statusChange: (from: PlayerStatus, to: PlayerStatus) => void;
    // error: (error: PlayerError, track: Track | null) => void;
    disconnected: () => void;
}

export type TrackEndReason = "finished" | "skipped" | "stopped" | "error" | "replaced";
