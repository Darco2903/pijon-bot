import { beforeEach, describe, expect, it, vi } from "vitest";
import { shouldRespond } from "../../../src/openai/decide.js";
import { AI_RESPOND_THRESHOLD, OPENAI_DECISIONS_MODEL } from "../../../src/consts.js";
import { botUser, fakeMessage, fakeUser } from "../fakes/discord.js";

const openai = vi.hoisted(() => ({
    decisions: { create: vi.fn() },
    responses: { create: vi.fn() },
}));

vi.mock("../../../src/openai/client.js", () => ({ openai }));

function decision(answers: unknown[]) {
    return { answers, model: OPENAI_DECISIONS_MODEL, usage: {} };
}

const predicate = (probability: number) => ({
    type: "predicate",
    name: "should_respond",
    probability,
});

describe("shouldRespond", () => {
    beforeEach(() => {
        openai.decisions.create.mockReset();
    });

    it("says yes above the threshold", async () => {
        openai.decisions.create.mockResolvedValue(decision([predicate(0.9)]));
        const res = await shouldRespond([fakeMessage()]);
        expect(res._unsafeUnwrap()).toBe(true);
    });

    it("says no below the threshold", async () => {
        openai.decisions.create.mockResolvedValue(decision([predicate(0.1)]));
        const res = await shouldRespond([fakeMessage()]);
        expect(res._unsafeUnwrap()).toBe(false);
    });

    it("says no exactly at the threshold", async () => {
        openai.decisions.create.mockResolvedValue(decision([predicate(AI_RESPOND_THRESHOLD)]));
        const res = await shouldRespond([fakeMessage()]);
        expect(res._unsafeUnwrap()).toBe(false);
    });

    it("stays quiet on a refusal", async () => {
        openai.decisions.create.mockResolvedValue(
            decision([{ type: "refusal", name: "should_respond" }]),
        );
        const res = await shouldRespond([fakeMessage()]);
        expect(res._unsafeUnwrap()).toBe(false);
    });

    it("stays quiet with no answer", async () => {
        openai.decisions.create.mockResolvedValue(decision([]));
        const res = await shouldRespond([fakeMessage()]);
        expect(res._unsafeUnwrap()).toBe(false);
    });

    it("returns an error when the API call fails", async () => {
        openai.decisions.create.mockRejectedValue(new Error("rate limited"));
        const res = await shouldRespond([fakeMessage()]);
        expect(res._unsafeUnwrapErr()).toBe("Decision failed: rate limited");
    });

    it("sends the transcript to the decisions model with one predicate question", async () => {
        openai.decisions.create.mockResolvedValue(decision([predicate(0.9)]));
        const messages = [
            fakeMessage({ author: fakeUser({ displayName: "Bob" }), content: "pijon?" }),
            fakeMessage({ author: botUser(), content: "oui" }),
        ];

        await shouldRespond(messages);

        const body = openai.decisions.create.mock.calls[0][0];
        expect(body.model).toBe(OPENAI_DECISIONS_MODEL);
        expect(body.input).toBe("[Bob] pijon?\n[Pijon Bot (toi)] oui");
        expect(body.questions).toHaveLength(1);
        expect(body.questions[0]).toMatchObject({ name: "should_respond", type: "predicate" });
    });
});
