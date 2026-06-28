import { withLogContext, getLogContext } from "./context.js";
import { pinoLogger, pinoHttpLogger } from "./pino-logger.js";
import type { Logger, LogContext } from "./types.js";

let currentLogger: Logger = pinoLogger;

export function setLogger(logger: Logger): void {
  currentLogger = logger;
}

export function getLogger(): Logger {
  return currentLogger;
}

export const log: Logger = {
  fatal: (msg, data) => currentLogger.fatal(msg, data),
  error: (msg, data) => currentLogger.error(msg, data),
  warn: (msg, data) => currentLogger.warn(msg, data),
  info: (msg, data) => currentLogger.info(msg, data),
  debug: (msg, data) => currentLogger.debug(msg, data),
  trace: (msg, data) => currentLogger.trace(msg, data),
};

export { withLogContext, getLogContext };
export { pinoHttpLogger as httpLogger };
export type { Logger, LogContext, LogLevel, HttpLogger } from "./types.js";
export { LogField } from "./types.js";

declare module "hono" {
  interface ContextVariableMap {
    logContext: LogContext;
  }
}