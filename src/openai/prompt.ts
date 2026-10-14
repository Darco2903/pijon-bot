import fs from "fs";
import path from "path";
import { rootPath } from "../utils.js";

const filePath = path.join(rootPath, "prompts", "pijon.txt");

export const prompt = fs.readFileSync(filePath, "utf-8");
