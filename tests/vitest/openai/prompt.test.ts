import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { prompt } from "../../../src/openai/prompt.js";

describe("prompt", () => {
    it("is loaded from prompts/pijon.txt", () => {
        const file = fs.readFileSync(path.resolve("prompts/pijon.txt"), "utf-8");
        expect(prompt).toBe(file);
    });

    it("is not empty and names the bot", () => {
        expect(prompt.trim().length).toBeGreaterThan(0);
        expect(prompt).toContain("Pijon Bot");
    });
});
