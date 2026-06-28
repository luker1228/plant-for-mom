import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

export type ToolContext = {
  userId: string;
  plantId?: string;
  imageUrls?: string[];
};

export const ToolErrorCode = {
  ToolNotFound: "tool_not_found",
  InvalidArgs: "invalid_args",
  ExecutionFailed: "execution_failed",
  Unauthorized: "unauthorized",
  NotFound: "not_found",
  Unknown: "unknown",
} as const;

export type ToolErrorCode = (typeof ToolErrorCode)[keyof typeof ToolErrorCode];

export type ToolResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: ToolErrorCode;
  metadata: ChatCompletionMessageParam;
};

export type ToolDefinition<TParams = unknown, TResult = unknown> = {
  name: string;
  description: string;
  schema: ChatCompletionTool["function"]["parameters"];
  execute: (params: TParams, context: ToolContext) => Promise<ToolResult<TResult>>;
};

export type ToolRegistry = Record<string, ToolDefinition>;