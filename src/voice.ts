import {
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    VoiceConnection,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import type { Guild } from "discord.js";
import { okAsync, ResultAsync } from "neverthrow";
import { logger } from "./logger.js";

export function joinVoice(channelId: string, guild: Guild): ResultAsync<VoiceConnection, string> {
    let conn = getVoiceConnection(guild.id);

    if (conn && conn.joinConfig.channelId === channelId) {
        if (conn.state.status === VoiceConnectionStatus.Ready) {
            logger.debug(`Already connected to voice channel ${channelId} in guild ${guild.id}`);
            return okAsync(conn);
        } else if (
            conn.state.status === VoiceConnectionStatus.Connecting
            || conn.state.status === VoiceConnectionStatus.Signalling
        ) {
            logger.debug(`Already connecting to voice channel ${channelId} in guild ${guild.id}`);
            return ResultAsync.fromPromise(
                entersState(conn, VoiceConnectionStatus.Ready, 5_000),
                (error) => (error instanceof Error ? error.message : String(error)),
            ).orTee(async (error) => {
                conn?.destroy();
                logger.error(`Failed to join voice channel: ${error}`);
            });
        }
    } else if (conn && conn.joinConfig.channelId !== channelId) {
        logger.debug(
            `Already connected to a different voice channel ${conn.joinConfig.channelId} in guild ${guild.id}, rejoining channel ${channelId}`,
        );
        conn.rejoin({
            channelId: channelId,
            selfDeaf: conn.joinConfig.selfDeaf,
            selfMute: conn.joinConfig.selfMute,
        });
    } else {
        logger.debug(`Joining voice channel ${channelId} in guild ${guild.id}`);
        conn = joinVoiceChannel({
            channelId: channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });
    }

    return ResultAsync.fromPromise(
        // Wait for the connection to enter the Ready state
        entersState(conn, VoiceConnectionStatus.Ready, 5_000),
        (error) => (error instanceof Error ? error.message : String(error)),
    ).orTee(async (error) => {
        conn.destroy();
        logger.error(`Failed to join voice channel: ${error}`);
    });
}
