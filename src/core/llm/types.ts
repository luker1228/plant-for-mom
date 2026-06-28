import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletion,
} from "openai/resources/chat/completions";

export type ModelCapability = "text" | "vision" | "reasoning" | "cheap";

export interface ModelInfo {
  id: string;
  capabilities: ModelCapability[];
}

export interface ModelPickerOptions {
  vision?: boolean;
  reasoning?: boolean;
  cheap?: boolean;
  override?: string;
}

export interface LLMClient {
  chat(
    messages: ChatCompletionMessageParam[],
    tools?: ChatCompletionTool[],
  ): Promise<ChatCompletion>;
}