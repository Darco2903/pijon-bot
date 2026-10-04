import type { Readable } from "stream";

export interface TrackStream {
    stream: Readable;
    destroy(): void;
}
