import { FishAudioClient } from "fish-audio";
import { config } from "../config.js";

export const fishAudio = new FishAudioClient({ apiKey: config.fish_audio.apiKey });
