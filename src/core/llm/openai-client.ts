import OpenAI from "openai";
import { modelManager } from "./model-manager.js";
import type { LLMClient, ModelPickerOptions } from "./types.js";

export interface OpenAIClientOptions {
  model?: ModelPickerOptions;
  client?: OpenAI;
}

export function createOpenAIClient(opts: OpenAIClientOptions = {}): LLMClient {
  const client = opts.client ?? null;
  return {
    async chat(messages, tools) {
      if (!client) {
        throw new Error(
          "createOpenAIClient: no OpenAI instance provided (pass one via opts.client or import openai from this module)",
        );
      }
      const model = modelManager.resolve(messages, opts.model ?? {});
      return client.chat.completions.create({
        model,
        messages,
        tools,
        tool_choice: tools ? ("auto" as const) : undefined,
      });
    },
  };
}