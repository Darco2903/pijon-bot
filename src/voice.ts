import {
    entersState,
    joinVoiceChannel,
    VoiceConnection,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import type { Guild } from "discord.js";
import { ResultAsync } from "neverthrow";
import { logger } from "./logger.js";

export function joinVoice(channelId: string, guild: Guild): ResultAsync<VoiceConnection, string> {
    const conn = joinVoiceChannel({
        channelId: channelId,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
    });

    return ResultAsync.fromPromise(
        // Wait for the connection to enter the Ready state
        entersState(conn, VoiceConnectionStatus.Ready, 5_000),
        (error) => (error instanceof Error ? error.message : String(error)),
    ).orTee(async (error) => {
        conn.destroy();
        logger.error(`Failed to join voice channel: ${error}`);
    });
}
