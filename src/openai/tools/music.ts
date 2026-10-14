import z from "zod";
import { ChannelType } from "discord.js";
import { errAsync, okAsync } from "neverthrow";
import { AudioPlayer } from "../../music-player/AudioPlayer.js";
import { resolveTrackId } from "../../music-player/resolve.js";
import { defineTool } from "./tool.js";

const play = defineTool({
    name: "music_play",
    description:
        "Play or queue a song in the voice channel of the user who asked. Query is a search or a YouTube URL.",
    parameters: z.object({ query: z.string() }),
    guildOnly: true,
    run({ query }, { message }) {
        const guild = message.guild!;
        const channel = message.member?.voice.channel ?? AudioPlayer.get(guild.id)?.voiceChannel;
        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return errAsync("The user is not in a voice channel.");
        }

        return resolveTrackId(query)
            .andThen((id) => AudioPlayer.getOrCreate(guild).play(id, channel))
            .map(({ track, queued, position }) =>
                queued ?
                    `Queued "${track.title}" at position ${position}.`
                :   `Now playing "${track.title}".`,
            );
    },
});

const control = defineTool({
    name: "music_control",
    description: "Control the music playing in this server, or get what's playing.",
    parameters: z.object({
        action: z.enum(["pause", "resume", "skip", "previous", "stop", "now_playing"]),
    }),
    guildOnly: true,
    run({ action }, { message }) {
        const player = AudioPlayer.get(message.guildId!);
        const current = player?.currentSong;
        if (!player || !current) return errAsync("Nothing is playing.");

        switch (action) {
            case "pause":
                return okAsync(player.pause() ? "Paused." : "Already paused.");
            case "resume":
                return okAsync(player.resume() ? "Resumed." : "It wasn't paused.");
            case "stop":
                player.stop();
                return okAsync("Stopped and cleared the queue.");
            case "skip":
                return player.skip().map(({ track }) => `Now playing "${track.title}".`);
            case "previous":
                return player.previous().map((track) => `Now playing "${track.title}".`);
            case "now_playing":
                return okAsync(`"${current.title}"${player.paused ? " (paused)" : ""}.`);
        }
    },
});

export const musicTools = [play, control];
