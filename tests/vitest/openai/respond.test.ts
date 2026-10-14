import { beforeEach, describe, expect, it, vi } from "vitest";
import { errAsync, okAsync } from "neverthrow";
import { respond, type TurnContext } from "../../../src/openai/respond.js";
import { prompt } from "../../../src/openai/prompt.js";
import { AI_MAX_TOOL_ROUNDS, OPENAI_RESPONSE_MODEL } from "../../../src/consts.js";
import { botUser, fakeChannel, fakeMessage, fakeUser } from "../fakes/discord.js";

const { openai, tools } = vi.hoisted(() => ({
    openai: { responses: { create: vi.fn() }, decisions: { create: vi.fn() } },
    tools: { toolsFor: vi.fn(), runTool: vi.fn() },
}));

vi.mock("../../../src/openai/client.js", () => ({ openai }));
vi.mock("../../../src/openai/tools/index.js", () => tools);

const TOOLS = [{ type: "web_search" }];

function textResponse(id: string, text: string) {
    return { id, output: [{ type: "message" }], output_text: text };
}

function toolResponse(id: string, calls: { name: string; args?: string; callId: string }[]) {
    return {
        id,
        output: calls.map((c) => ({
            type: "function_call",
            name: c.name,
            arguments: c.args ?? "{}",
            call_id: c.callId,
        })),
        output_text: "",
    };
}

function turn(overrides: Partial<TurnContext> = {}): TurnContext {
    return { state: { summary: "", cursorId: null }, memories: [], tail: [], ...overrides };
}

beforeEach(() => {
    openai.responses.create.mockReset();
    tools.toolsFor.mockReset().mockReturnValue(TOOLS);
    tools.runTool.mockReset();
});

describe("respond", () => {
    it("returns the model's text when there's no tool call", async () => {
        openai.responses.create.mockResolvedValue(textResponse("r1", "  salut  "));

        const res = await respond(fakeMessage(), turn());

        expect(res._unsafeUnwrap()).toBe("salut");
        expect(openai.responses.create).toHaveBeenCalledTimes(1);
    });

    it("sends the persona, the chat input, the tools and the channel as cache key", async () => {
        openai.responses.create.mockResolvedValue(textResponse("r1", "ok"));
        const channel = fakeChannel();
        const message = fakeMessage({ channel, content: "pijon ?" });
        const tail = [
            fakeMessage({ channel, author: fakeUser({ displayName: "Bob" }), content: "yo" }),
            fakeMessage({ channel, author: botUser(), content: "salut" }),
        ];

        await respond(message, turn({ tail }));

        const body = openai.responses.create.mock.calls[0][0];
        expect(body.model).toBe(OPENAI_RESPONSE_MODEL);
        expect(body.instructions).toBe(prompt);
        expect(body.input).toEqual([
            { role: "user", content: "[Bob] yo" },
            { role: "assistant", content: "salut" },
        ]);
        expect(body.tools).toBe(TOOLS);
        expect(body.prompt_cache_key).toBe(channel.id);
        expect(body.previous_response_id).toBeUndefined();
        expect(tools.toolsFor).toHaveBeenCalledWith(message);
    });

    it("adds the summary and memories to the instructions only when there are some", async () => {
        openai.responses.create.mockResolvedValue(textResponse("r1", "ok"));

        await respond(
            fakeMessage(),
            turn({
                state: { summary: "on parlait de pizza", cursorId: "1" },
                memories: [
                    { id: 3, content: "Alice aime le jazz" },
                    { id: 1, content: "Bob est nul à Mario Kart" },
                ],
            }),
        );

        const instructions: string = openai.responses.create.mock.calls[0][0].instructions;
        expect(instructions.startsWith(prompt)).toBe(true);
        expect(instructions).toContain("## Résumé des échanges précédents\non parlait de pizza");
        expect(instructions).toContain(
            "## Souvenirs\n- #3 Alice aime le jazz\n- #1 Bob est nul à Mario Kart",
        );
    });

    it("runs tool calls one after another and sends their results back", async () => {
        openai.responses.create
            .mockResolvedValueOnce(
                toolResponse("r1", [
                    { name: "music_play", args: '{"query":"lofi"}', callId: "c1" },
                    {
                        name: "remember",
                        args: '{"content":"x","about_author":false}',
                        callId: "c2",
                    },
                ]),
            )
            .mockResolvedValueOnce(textResponse("r2", "c'est parti"));

        const order: string[] = [];
        let firstDone = false;
        tools.runTool.mockImplementation((name: string) => {
            order.push(`start ${name}`);
            // the second call must not start before the first one finished
            if (name === "remember") expect(firstDone).toBe(true);
            return okAsync(`${name} done`).andTee(() => {
                firstDone = true;
                order.push(`end ${name}`);
            });
        });

        const message = fakeMessage();
        const res = await respond(message, turn());

        expect(res._unsafeUnwrap()).toBe("c'est parti");
        expect(order).toEqual([
            "start music_play",
            "end music_play",
            "start remember",
            "end remember",
        ]);
        expect(tools.runTool).toHaveBeenNthCalledWith(1, "music_play", '{"query":"lofi"}', {
            message,
            contextStartId: message.id,
        });

        const second = openai.responses.create.mock.calls[1][0];
        expect(second.previous_response_id).toBe("r1");
        expect(second.input).toEqual([
            { type: "function_call_output", call_id: "c1", output: "music_play done" },
            { type: "function_call_output", call_id: "c2", output: "remember done" },
        ]);
    });

    it("keeps the instructions on follow-up calls", async () => {
        openai.responses.create
            .mockResolvedValueOnce(toolResponse("r1", [{ name: "t", callId: "c1" }]))
            .mockResolvedValueOnce(textResponse("r2", "ok"));
        tools.runTool.mockReturnValue(okAsync("done"));

        await respond(fakeMessage(), turn({ state: { summary: "s", cursorId: null } }));

        const [first, second] = openai.responses.create.mock.calls.map((c) => c[0]);
        expect(second.instructions).toBe(first.instructions);
        expect(second.tools).toBe(first.tools);
        expect(second.model).toBe(first.model);
    });

    it("gives the context's oldest message to the tools", async () => {
        openai.responses.create
            .mockResolvedValueOnce(toolResponse("r1", [{ name: "search_history", callId: "c1" }]))
            .mockResolvedValueOnce(textResponse("r2", "ok"));
        tools.runTool.mockReturnValue(okAsync("done"));
        const tail = [fakeMessage(), fakeMessage()];

        await respond(fakeMessage(), turn({ tail }));

        expect(tools.runTool.mock.calls[0][2].contextStartId).toBe(tail[0].id);
    });

    it("shows a tool error to the model instead of failing", async () => {
        openai.responses.create
            .mockResolvedValueOnce(toolResponse("r1", [{ name: "music_play", callId: "c1" }]))
            .mockResolvedValueOnce(textResponse("r2", "t'es pas en vocal"));
        tools.runTool.mockReturnValue(errAsync("The user is not in a voice channel."));

        const res = await respond(fakeMessage(), turn());

        expect(res._unsafeUnwrap()).toBe("t'es pas en vocal");
        expect(openai.responses.create.mock.calls[1][0].input).toEqual([
            {
                type: "function_call_output",
                call_id: "c1",
                output: "Error: The user is not in a voice channel.",
            },
        ]);
    });

    it(`stops after ${AI_MAX_TOOL_ROUNDS} rounds of tool calls`, async () => {
        let n = 0;
        openai.responses.create.mockImplementation(async () =>
            toolResponse(`r${++n}`, [{ name: "t", callId: `c${n}` }]),
        );
        tools.runTool.mockReturnValue(okAsync("done"));

        const res = await respond(fakeMessage(), turn());

        expect(res.isOk()).toBe(true);
        expect(openai.responses.create).toHaveBeenCalledTimes(AI_MAX_TOOL_ROUNDS + 1);
        expect(tools.runTool).toHaveBeenCalledTimes(AI_MAX_TOOL_ROUNDS);
    });

    it("falls back to an ellipsis when the model says nothing", async () => {
        openai.responses.create.mockResolvedValue(textResponse("r1", "   "));

        const res = await respond(fakeMessage(), turn());

        expect(res._unsafeUnwrap()).toBe("…");
    });

    it("returns an error when the API call fails", async () => {
        openai.responses.create.mockRejectedValue(new Error("overloaded"));

        const res = await respond(fakeMessage(), turn());

        expect(res._unsafeUnwrapErr()).toBe("Response failed: overloaded");
    });

    it("returns an error when a follow-up call fails", async () => {
        openai.responses.create
            .mockResolvedValueOnce(toolResponse("r1", [{ name: "t", callId: "c1" }]))
            .mockRejectedValueOnce(new Error("overloaded"));
        tools.runTool.mockReturnValue(okAsync("done"));

        const res = await respond(fakeMessage(), turn());

        expect(res._unsafeUnwrapErr()).toBe("Response failed: overloaded");
    });
});
