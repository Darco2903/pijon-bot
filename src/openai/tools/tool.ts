import type z from "zod";
import type { Message } from "discord.js";
import type { ResultAsync } from "neverthrow";

export interface ToolContext {
    message: Message;
    /** Oldest message in the model's context, history before it isn't visible */
    contextStartId: string;
}

export interface BotTool<S extends z.ZodType = z.ZodType> {
    name: string;
    description: string;
    /** Strict mode: use .nullable() instead of .optional() */
    parameters: S;
    /** Hidden in DMs */
    guildOnly?: boolean;
    /** Both the result and the error are shown to the model */
    run(args: z.infer<S>, ctx: ToolContext): ResultAsync<string, string>;
}

export function defineTool<S extends z.ZodType>(tool: BotTool<S>): BotTool<S> {
    return tool;
}
