// import { ResultAsync } from "neverthrow";
// import { fishAudio } from "./client.js";
// import { FISH_AUDIO_MODEL, FISH_AUDIO_VOICE_MODEL } from "../consts.js";

// export function textToSpeech(text: string): ResultAsync<ReadableStream<Uint8Array>, string> {
//     return ResultAsync.fromPromise(
//         // convert() returns a ReadableStream<Uint8Array>. Write each chunk the
//         // moment it arrives instead of waiting for the whole clip.
//         fishAudio.textToSpeech.convert(
//             {
//                 text: text,
//                 format: "opus",
//                 reference_id: FISH_AUDIO_VOICE_MODEL,
//             },
//             FISH_AUDIO_MODEL,
//         ),
//         (error) => `Failed to convert text to speech: ${error instanceof Error ? error.message : String(error)}`,
//     );
// }
