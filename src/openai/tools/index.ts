import type { Message } from "discord.js";
import { errAsync, type ResultAsync } from "neverthrow";
import { zodResponsesFunction } from "openai/helpers/zod";
import type { Tool } from "openai/resources/responses/responses";
import { safeJSONParse, safeParse } from "../../utils.js";
import type { BotTool, ToolContext } from "./tool.js";
import { musicTools } from "./music.js";
import { voiceTools } from "./voice.js";
import { memoryTools } from "./memory.js";

export type { ToolContext } from "./tool.js";

const tools: BotTool<any>[] = [
    //
    ...musicTools,
    ...voiceTools,
    ...memoryTools,
];

export function toolsFor(message: Message): Tool[] {
    return [
        ...tools
            .filter((tool) => !tool.guildOnly || message.inGuild())
            .map((tool) =>
                zodResponsesFunction({
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                }),
            ),
        { type: "web_search" },
    ];
}

export function runTool(
    name: string,
    rawArgs: string,
    ctx: ToolContext,
): ResultAsync<string, string> {
    const tool = tools.find((t) => t.name === name);
    if (!tool) return errAsync(`Unknown tool ${name}`);

    return safeJSONParse(rawArgs)
        .mapErr(() => "Arguments are not valid JSON")
        .andThen((json) => safeParse(tool.parameters, json).mapErr((error) => error.message))
        .asyncAndThen((args) => tool.run(args, ctx));
}
