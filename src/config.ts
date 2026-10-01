import fs from "node:fs";
import z from "zod";
import dotenv from "dotenv";
import { logger } from "./logger.js";

dotenv.config();

let fileConfig: any = {};

const configSchema = z.object({
    database: z.object({
        host: z.string(),
        user: z.string(),
        password: z.string(),
        name: z.string(),
        // key: z.string(),
    }),
    discord: z.object({
        clientId: z.string(),
        token: z.string(),
        guilds: z.array(
            z.object({
                name: z.string(),
                id: z.string(),
            }),
        ),
        channels: z.array(
            z.object({
                name: z.string(),
                id: z.string(),
            }),
        ),
    }),
    fish_audio: z.object({
        apiKey: z.string(),
    }),
    openai: z.object({
        apiKey: z.string(),
    }),
});

try {
    fileConfig = JSON.parse(fs.readFileSync("config.json", "utf-8"));
} catch (err) {
    logger.error(`Failed to read config.json: ${err}`);
    process.exit(1);
}

const parsedConfig = configSchema.safeParse({
    database: {
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        name: process.env.DATABASE_NAME,
        // key: process.env.DATABASE_KEY,
    },
    discord: {
        clientId: process.env.DISCORD_CLIENT_ID,
        token: process.env.DISCORD_TOKEN,
        guilds: fileConfig?.discord?.guilds,
        channels: fileConfig?.discord?.channels,
    },
    fish_audio: {
        apiKey: process.env.FISH_AUDIO_API_KEY,
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
    },
});

if (!parsedConfig.success) {
    logger.error(`Invalid configuration: ${parsedConfig.error.message}`);
    process.exit(1);
}
export const config = parsedConfig.data;

logger.info("Configuration loaded successfully.");
