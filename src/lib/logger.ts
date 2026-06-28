import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";
import type { MiddlewareHandler } from "hono";
import { config } from "../config.js";

const isDev = config.NODE_ENV === "development" || config.NODE_ENV === "test";

/** 底层 pino 实例，需要直接访问时用 */
export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: "plant-for-mom", env: config.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

export type Logger = typeof logger;

/* ------------------------------------------------------------------ */
/* 上下文 (AsyncLocalStorage)                                          */
/* ------------------------------------------------------------------ */

type LogContext = Record<string, unknown>;

const als = new AsyncLocalStorage<LogContext>();

/** 在指定日志上下文中执行 fn；父子作用域会自动合并 */
export function withLogContext<T>(bindings: LogContext, fn: () => T): T {
  const parent = als.getStore() ?? {};
  return als.run({ ...parent, ...bindings }, fn);
}

/** 获取当前上下文（无则为空对象） */
export function getLogContext(): LogContext {
  return als.getStore() ?? {};
}

/* ------------------------------------------------------------------ */
/* 上下文 logger：只需关心 message                                     */
/* ------------------------------------------------------------------ */

type Level = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

function emit(level: Level, msg: string | Error, data?: LogContext): void {
  const ctx = als.getStore() ?? {};
  (logger[level] as Function)({ ...ctx, ...data }, msg);
}

export const log = {
  fatal: (msg: string, data?: LogContext) => emit("fatal", msg, data),
  error: (msg: string, data?: LogContext) => emit("error", msg, data),
  warn: (msg: string, data?: LogContext) => emit("warn", msg, data),
  info: (msg: string, data?: LogContext) => emit("info", msg, data),
  debug: (msg: string, data?: LogContext) => emit("debug", msg, data),
  trace: (msg: string, data?: LogContext) => emit("trace", msg, data),
} as const;

export type Log = typeof log;

/* ------------------------------------------------------------------ */
/* Hono 中间件                                                          */
/* ------------------------------------------------------------------ */

export const pinoHttpLogger: MiddlewareHandler = async (c, next) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const start = Date.now();

  await withLogContext(
    {
      requestId,
      method: c.req.method,
      path: c.req.path,
    },
    async () => {
      c.set("logContext", getLogContext());
      await next();
    },
  );

  const duration = Date.now() - start;
  log.info("req", { status: c.res.status, durationMs: duration });
};

declare module "hono" {
  interface ContextVariableMap {
    logContext: LogContext;
  }
}