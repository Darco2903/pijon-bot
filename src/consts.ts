import type { Backends } from "fish-audio";
import type { ResponsesModel } from "openai/resources";

export const OPENAI_MODEL: ResponsesModel = "gpt-5-nano";
// export const OPENAI_MODEL: ResponsesModel = "gpt-6-luna";
export const FISH_AUDIO_MODEL: Backends = "s2.1-pro-free" as Backends;
// export const FISH_AUDIO_VOICE_MODEL: string = "bf322df2096a46f18c579d0baa36f41d"; //
export const FISH_AUDIO_VOICE_MODEL: string = "9a9cf47702da476aa4629e2506d4a857"; // Hanna
// export const FISH_AUDIO_VOICE_MODEL: string = "98655a12fa944e26b274c535e5e03842"; // E-girl

export const YT_DLP_UPDATE_CRON = "0 */12 * * *"; // Every 12 hours

export const VOICE_READY_TIMEOUT_MS = 5_000;
export const VOICE_ALONE_TIMEOUT_MS = 2 * 60_000; // Leave after 2 minutes alone in a channel
