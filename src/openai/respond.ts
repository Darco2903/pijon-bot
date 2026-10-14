import type { Message } from "discord.js";
import { okAsync, type ResultAsync } from "neverthrow";
import type {
    Response,
    ResponseCreateParamsNonStreaming,
    ResponseFunctionToolCall,
    ResponseInputItem,
} from "openai/resources/responses/responses";
import { openai } from "./client.js";
import { safeCall } from "./index.js";
import { prompt } from "./prompt.js";
import { toInput } from "./context.js";
import type { ChannelState, Memory } from "./memory.js";
import { runTool, toolsFor, type ToolContext } from "./tools/index.js";
import { AI_MAX_TOOL_ROUNDS, OPENAI_RESPONSE_MODEL } from "../consts.js";

export interface TurnContext {
    state: ChannelState;
    memories: Memory[];
    tail: Message[];
}

function buildInstructions({ state, memories }: TurnContext): string {
    let text = prompt;
    if (state.summary) text += `\n\n## Résumé des échanges précédents\n${state.summary}`;
    if (memories.length > 0) {
        text += `\n\n## Souvenirs\n${memories.map((m) => `- #${m.id} ${m.content}`).join("\n")}`;
    }
    return text;
}

/** Tool calls run one after another, they have side effects */
function runCalls(
    calls: ResponseFunctionToolCall[],
    ctx: ToolContext,
): ResultAsync<ResponseInputItem[], never> {
    return calls.reduce(
        (acc, call) =>
            acc.andThen((outputs) =>
                runTool(call.name, call.arguments, ctx)
                    // the model sees the failure and can explain it
                    .orElse((error) => okAsync(`Error: ${error}`))
                    .map((output): ResponseInputItem[] => [
                        ...outputs,
                        { type: "function_call_output", call_id: call.call_id, output },
                    ]),
            ),
        okAsync<ResponseInputItem[], never>([]),
    );
}

function step(
    params: ResponseCreateParamsNonStreaming,
    ctx: ToolContext,
    round: number,
): ResultAsync<Response, string> {
    return safeCall(openai.responses.create(params), "Response").andThen((response) => {
        const calls = response.output.filter(
            (item): item is ResponseFunctionToolCall => item.type === "function_call",
        );
        if (calls.length === 0 || round >= AI_MAX_TOOL_ROUNDS) return okAsync(response);

        // instructions aren't carried over by previous_response_id, so params keeps them
        return runCalls(calls, ctx).andThen((outputs) =>
            step({ ...params, previous_response_id: response.id, input: outputs }, ctx, round + 1),
        );
    });
}

export function respond(message: Message, turn: TurnContext): ResultAsync<string, string> {
    const ctx: ToolContext = { message, contextStartId: turn.tail[0]?.id ?? message.id };

    return step(
        {
            model: OPENAI_RESPONSE_MODEL,
            instructions: buildInstructions(turn),
            input: toInput(turn.tail),
            tools: toolsFor(message),
            reasoning: { effort: "low" },
            prompt_cache_key: message.channelId,
        },
        ctx,
        0,
    ).map((response) => response.output_text.trim() || "…");
}
