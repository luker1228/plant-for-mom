import pino, { type Logger as PinoInstance } from "pino";
import type { MiddlewareHandler } from "hono";
import { getLogContext, withLogContext } from "./context.js";
import { LogField } from "./types.js";
import type { Logger, LogContext, LogLevel } from "./types.js";

const nodeEnv = process.env.NODE_ENV ?? "development";
const logLevel = process.env.LOG_LEVEL ?? "info";
const pretty = process.env.LOG_PRETTY === "true";

let pinoInstance: PinoInstance | null = null;

function getPino(): PinoInstance {
  if (pinoInstance) return pinoInstance;
  pinoInstance = pino({
    level: logLevel,
    base: { service: "plant-for-mom", env: nodeEnv },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(pretty
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
  return pinoInstance;
}

function emit(level: LogLevel, msg: string, data?: LogContext): void {
  const ctx = getLogContext();
  (getPino()[level] as Function)({ ...ctx, ...data }, msg);
}

export const pinoLogger: Logger = {
  fatal: (m, d) => emit("fatal", m, d),
  error: (m, d) => emit("error", m, d),
  warn: (m, d) => emit("warn", m, d),
  info: (m, d) => emit("info", m, d),
  debug: (m, d) => emit("debug", m, d),
  trace: (m, d) => emit("trace", m, d),
};

export const pinoHttpLogger: MiddlewareHandler = async (c, next) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const start = Date.now();

  await withLogContext(
    {
      [LogField.RequestId]: requestId,
      method: c.req.method,
      path: c.req.path,
    },
    async () => {
      c.set("logContext", getLogContext());
      await next();
    },
  );

  const duration = Date.now() - start;
  pinoLogger.info(`${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`, {
    [LogField.DurationMs]: duration,
  });
};