import type { Backends } from "fish-audio";
import type { ResponsesModel } from "openai/resources";

export const PRISMA_CONNECTION_TIMEOUT_MS = 1000;
export const PRISMA_CONNECTION_RETRY_COUNT = 5;

export const VOICE_READY_TIMEOUT_MS = 5_000;
export const VOICE_ALONE_TIMEOUT_MS = 2 * 60_000; // Leave after 2 minutes alone in a channel

export const YT_DLP_UPDATE_CRON = "0 */12 * * *"; // Every 12 hours
export const AUDIO_CACHE_PRUNE_CRON = "30 * * * *"; // Every hour

export const OPENAI_RESPONSE_MODEL: ResponsesModel = "gpt-6-luna";
export const OPENAI_DECISIONS_MODEL: ResponsesModel = "gpt-6-luna";
export const OPENAI_SUMMARY_MODEL: ResponsesModel = "gpt-5-nano";
export const FISH_AUDIO_MODEL: Backends = "s2.1-pro-free" as Backends;
// export const FISH_AUDIO_VOICE_MODEL: string = "bf322df2096a46f18c579d0baa36f41d"; //
export const FISH_AUDIO_VOICE_MODEL: string = "9a9cf47702da476aa4629e2506d4a857"; // Hanna
// export const FISH_AUDIO_VOICE_MODEL: string = "98655a12fa944e26b274c535e5e03842"; // E-girl

export const AI_CONTEXT_KEEP = 20; // raw messages left after a compaction
export const AI_CONTEXT_COMPACT_AT = 60; // raw messages before compacting
export const AI_DECISION_WINDOW = 10; // messages the classifier sees
export const AI_RESPOND_THRESHOLD = 0.5;
export const AI_MAX_TOOL_ROUNDS = 5;
export const AI_MEMORY_LIMIT = 20;
export const AI_MESSAGE_MAX_CHARS = 1500; // longer messages are cut in the context
export const AI_HISTORY_SCAN_LIMIT = 500; // messages search_history looks through
