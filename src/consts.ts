import type { Backends } from "fish-audio";
import type { ResponsesModel } from "openai/resources";

export const OPENAI_MODEL: ResponsesModel = "gpt-5-nano";
// export const OPENAI_MODEL: ResponsesModel = "gpt-6-luna";
export const FISH_AUDIO_MODEL: Backends = "s2.1-pro-free" as Backends;
export const FISH_AUDIO_VOICE_MODEL: string = "bf322df2096a46f18c579d0baa36f41d";
