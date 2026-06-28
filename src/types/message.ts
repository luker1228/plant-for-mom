export const MessageRole = {
  System: "system",
  User: "user",
  Assistant: "assistant",
  Tool: "tool",
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];