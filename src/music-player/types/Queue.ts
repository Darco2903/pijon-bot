import z from "zod";
import { ITrackSchema } from "./Track.js";

export const QueueItemSchema = z.object({
    guildId: z.string(),
    channelId: z.string(),
    playlist: z.array(ITrackSchema).min(1),
    position: z.number().int().nonnegative(),
    /** Position in the current track, in milliseconds */
    time: z.number().nonnegative(),
    paused: z.boolean(),
});

export type QueueItem = z.infer<typeof QueueItemSchema>;

export const QueueDataSchema = z.object({
    items: z.array(QueueItemSchema),
    savedAt: z.number(),
});

export type QueueData = z.infer<typeof QueueDataSchema>;
