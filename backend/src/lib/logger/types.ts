import type { MiddlewareHandler } from "hono";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

export type LogContext = Record<string, unknown>;

export const LogField = {
  RequestId: "requestId",
  UserId: "userId",
  ToolName: "toolName",
  DurationMs: "durationMs",
} as const;

export type LogFieldKey = (typeof LogField)[keyof typeof LogField];

export interface Logger {
  fatal(msg: string, data?: LogContext): void;
  error(msg: string, data?: LogContext): void;
  warn(msg: string, data?: LogContext): void;
  info(msg: string, data?: LogContext): void;
  debug(msg: string, data?: LogContext): void;
  trace(msg: string, data?: LogContext): void;
}

export interface HttpLogger {
  middleware(): MiddlewareHandler;
}