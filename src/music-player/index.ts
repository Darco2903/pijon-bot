import { ResultAsync } from "neverthrow";
import { getVoiceConnections } from "@discordjs/voice";
import { AudioPlayer } from "./AudioPlayer.js";
import { AudioCache } from "./AudioCache.js";
import { logger } from "../logger.js";
import { config } from "../config.js";

export const audioCache = new AudioCache({
    dir: config.musicplayer.cache.path,
    maxSizeBytes: config.musicplayer.cache.maxSize,
    ttlMs: config.musicplayer.cache.maxAge,
});

export async function stopMusicPlayer(): Promise<void> {
    await AudioPlayer.saveAll().match(
        () => {
            logger.debug(`Successfully saved audio player state for all guilds.`);
        },
        (error) => {
            logger.error(error);
        },
    );

    AudioPlayer.all.forEach((player) => player.destroy());
    getVoiceConnections().forEach((connection) => connection.destroy());
}
