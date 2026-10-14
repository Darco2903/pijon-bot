import type { Message } from "discord.js";
import type { ResultAsync } from "neverthrow";
import { openai } from "./client.js";
import { safeCall } from "./index.js";
import { toTranscript } from "./context.js";
import { AI_RESPOND_THRESHOLD, OPENAI_DECISIONS_MODEL } from "../consts.js";

export function shouldRespond(recent: Message[]): ResultAsync<boolean, string> {
    return safeCall(
        openai.decisions.create({
            model: OPENAI_DECISIONS_MODEL,
            input: toTranscript(recent),
            questions: [
                {
                    name: "should_respond",
                    type: "predicate",
                    instructions:
                        "This is a Discord channel transcript. You are Pijon Bot; your own messages are labeled [Pijon Bot (toi)]. "
                        + "Should you reply to the LAST message? Yes if it addresses you (Pijon, pijon, le bot, the bot), "
                        + "follows up on something you said, or asks the room something you can clearly help with. "
                        + "No if people are talking among themselves or you already answered it.",
                },
            ],
        }),
        "Decision",
    ).map((decision) => {
        const answer = decision.answers[0];
        // a refusal means the classifier won't judge it, so stay quiet
        return answer?.type === "predicate" && answer.probability > AI_RESPOND_THRESHOLD;
    });
}
