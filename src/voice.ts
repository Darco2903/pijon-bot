import {
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    VoiceConnection,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import type { Guild, VoiceState } from "discord.js";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { AudioPlayer } from "./music-player/AudioPlayer.js";
import { logger } from "./logger.js";
import { VOICE_ALONE_TIMEOUT_MS, VOICE_READY_TIMEOUT_MS } from "./consts.js";

const aloneTimers = new Map<string, NodeJS.Timeout>();

/** destroy() throws on an already destroyed connection, which the watcher can cause at any time. */
function destroyConnection(conn: VoiceConnection): void {
    if (conn.state.status !== VoiceConnectionStatus.Destroyed) {
        conn.destroy();
    }
}

/** Whether a non-bot user is in the channel. Members missing from the cache count as listeners. */
function hasListeners(guild: Guild, channelId: string): boolean {
    return guild.voiceStates.cache.some(
        (state) =>
            state.channelId === channelId
            && state.id !== guild.client.user.id
            && !state.member?.user.bot,
    );
}

function waitReady(conn: VoiceConnection, guildId: string): ResultAsync<VoiceConnection, string> {
    return ResultAsync.fromPromise(
        entersState(conn, VoiceConnectionStatus.Ready, VOICE_READY_TIMEOUT_MS),
        (error) => (error instanceof Error ? error.message : String(error)),
    )
        .orTee((error) => {
            logger.error(`Failed to join voice channel in guild ${guildId}: ${error}`);
            destroyConnection(conn);
        })
        .mapErr(() => "I couldn't connect to the voice channel.");
}

/** Errors are user-facing messages; technical details are logged. */
export function joinVoice(channelId: string, guild: Guild): ResultAsync<VoiceConnection, string> {
    const conn = getVoiceConnection(guild.id);

    if (!conn) {
        logger.debug(`Joining voice channel ${channelId} in guild ${guild.id}`);
        const newConn = joinVoiceChannel({
            channelId: channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });
        watchConnection(newConn, guild.id);
        return waitReady(newConn, guild.id);
    }

    const currentChannelId = conn.joinConfig.channelId;
    if (currentChannelId !== null && currentChannelId !== channelId) {
        // Don't take the bot away from people who are listening to it.
        const player = AudioPlayer.get(guild.id);
        const active = player !== undefined && (player.playing || player.paused);
        if (active && hasListeners(guild, currentChannelId)) {
            return errAsync(`I'm already playing in <#${currentChannelId}>.`);
        }

        logger.debug(
            `Moving from voice channel ${currentChannelId} to ${channelId} in guild ${guild.id}`,
        );
        // Same connection object, so the watcher stays attached.
        conn.rejoin({
            channelId: channelId,
            selfDeaf: conn.joinConfig.selfDeaf,
            selfMute: conn.joinConfig.selfMute,
        });
        return waitReady(conn, guild.id);
    }

    if (conn.state.status === VoiceConnectionStatus.Ready) {
        logger.debug(`Already connected to voice channel ${channelId} in guild ${guild.id}`);
        return okAsync(conn);
    }

    // Signalling/Connecting: a join or move is in progress.
    // Disconnected: the watcher either reconnects (moved) or destroys it (kicked) within the timeout.
    logger.debug(`Waiting for voice connection (${conn.state.status}) in guild ${guild.id}`);
    return waitReady(conn, guild.id);
}

/** Must be attached exactly once per connection, when it is created. */
function watchConnection(conn: VoiceConnection, guildId: string): void {
    conn.on(VoiceConnectionStatus.Disconnected, async () => {
        // Moved to another channel: the library reconnects by itself.
        await Promise.race([
            entersState(conn, VoiceConnectionStatus.Signalling, VOICE_READY_TIMEOUT_MS),
            entersState(conn, VoiceConnectionStatus.Connecting, VOICE_READY_TIMEOUT_MS),
        ])
            .then(() => {
                const channelId = conn.joinConfig.channelId;
                logger.info(`Voice connection moved to ${channelId} in guild ${guildId}`);
            })
            .catch(() => {
                // Kicked, or the reconnect failed.
                logger.info(`Voice connection lost in guild ${guildId}`);
                destroyConnection(conn);
            });
    });

    // The only cleanup path: /leave, kick, auto-leave, failed join and shutdown all end here.
    conn.once(VoiceConnectionStatus.Destroyed, () => {
        logger.debug(`Voice connection destroyed in guild ${guildId}`);
        clearAloneTimer(guildId);
        AudioPlayer.get(guildId)?.destroy();
    });
}

export function leaveVoice(guildId: string): boolean {
    const conn = getVoiceConnection(guildId);
    if (!conn) return false;
    destroyConnection(conn); // the Destroyed handler does the rest
    return true;
}

function clearAloneTimer(guildId: string): void {
    const timer = aloneTimers.get(guildId);
    if (timer) {
        clearTimeout(timer);
        aloneTimers.delete(guildId);
    }
}

/**
 * Leaves the voice channel after VOICE_ALONE_TIMEOUT_MS without listeners.
 * Register on Events.VoiceStateUpdate. It also fires for the bot itself, so joins and moves
 * into an empty channel start the timer too.
 */
export function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void {
    const guild = newState.guild;
    if (!getVoiceConnection(guild.id)) return;

    // The client's cache is already updated when the event fires, unlike conn.joinConfig.
    const botChannelId = guild.members.me?.voice.channelId;
    if (!botChannelId) return;

    // Ignore changes that don't involve the bot's channel.
    if (oldState.channelId !== botChannelId && newState.channelId !== botChannelId) return;

    if (hasListeners(guild, botChannelId)) {
        clearAloneTimer(guild.id);
        return;
    }

    if (aloneTimers.has(guild.id)) return;
    logger.debug(
        `Alone in voice channel ${botChannelId} in guild ${guild.id}, leaving in ${VOICE_ALONE_TIMEOUT_MS}ms`,
    );
    aloneTimers.set(
        guild.id,
        setTimeout(() => {
            aloneTimers.delete(guild.id);
            const channelId = guild.members.me?.voice.channelId;
            if (channelId && hasListeners(guild, channelId)) return;
            logger.info(`Leaving voice channel in guild ${guild.id}: no listeners`);
            leaveVoice(guild.id);
        }, VOICE_ALONE_TIMEOUT_MS),
    );
}
