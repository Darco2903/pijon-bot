import z from "zod";
import dotenv from "dotenv";

dotenv.config();

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
    }),
    fish_audio: z.object({
        apiKey: z.string(),
    }),
    openai: z.object({
        apiKey: z.string(),
    }),
});

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
    },
    fish_audio: {
        apiKey: process.env.FISH_AUDIO_API_KEY,
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
    },
});

if (!parsedConfig.success) {
    console.error("Invalid configuration:", parsedConfig.error.message);
    process.exit(1);
}
export const config = parsedConfig.data;
