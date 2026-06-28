import OpenAI from "openai";
import { config } from "../config.js";
import type { LLMClient } from "../agent/BaseAgent.js";

export const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

export const MODEL = config.OPENAI_MODEL;
export const VISION_MODEL = config.OPENAI_VISION_MODEL;

export const openaiLLMClient: LLMClient = {
  async chat(messages, tools) {
    return openai.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: tools ? "auto" : undefined,
    });
  },
};