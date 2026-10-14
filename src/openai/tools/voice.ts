import z from "zod";
import { errAsync, okAsync } from "neverthrow";
import { leaveVoice } from "../../voice.js";
import { defineTool } from "./tool.js";

const leave = defineTool({
    name: "leave_voice",
    description: "Leave the voice channel the bot is in. This stops the music.",
    parameters: z.object({}),
    guildOnly: true,
    run(_args, { message }) {
        return leaveVoice(message.guildId!) ?
                okAsync("Left the voice channel.")
            :   errAsync("I'm not in a voice channel.");
    },
});

// const status = defineTool({
//     name: "set_voice_status",
//     description:
//         "Set the status shown under the voice channel the bot is in (max 500 chars), or clear it with null.",
//     parameters: z.object({ status: z.string().nullable() }),
//     guildOnly: true,
//     run({ status }, { message }) {
//         const channelId = message.guild!.members.me?.voice.channelId;
//         if (!channelId) return errAsync("I'm not in a voice channel.");

//         return setVoiceChannelStatus(message.client, channelId, status?.slice(0, 500) ?? null).map(
//             () => (status ? "Status set." : "Status cleared."),
//         );
//     },
// });

export const voiceTools = [leave];
