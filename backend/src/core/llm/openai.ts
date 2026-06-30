import OpenAI from "openai";
import { config } from "../../config.js";
import { modelManager } from "./model-manager.js";
import { createOpenAIClient } from "./openai-client.js";
import type { LLMClient } from "./types.js";

export const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  ...(config.OPENAI_BASE_URL ? { baseURL: config.OPENAI_BASE_URL } : {}),
});

modelManager.register({ id: config.OPENAI_MODEL, capabilities: ["text", "reasoning"] });
modelManager.setDefault("text", config.OPENAI_MODEL);
modelManager.setDefault("reasoning", config.OPENAI_MODEL);

if (config.OPENAI_VISION_MODEL && config.OPENAI_VISION_MODEL !== config.OPENAI_MODEL) {
  modelManager.register({ id: config.OPENAI_VISION_MODEL, capabilities: ["vision"] });
  modelManager.setDefault("vision", config.OPENAI_VISION_MODEL);
} else {
  modelManager.setDefault("vision", config.OPENAI_MODEL);
}

export const openaiLLMClient: LLMClient = createOpenAIClient({ client: openai });