import { AsyncLocalStorage } from "node:async_hooks";
import type { LogContext } from "./types.js";

const als = new AsyncLocalStorage<LogContext>();

export function withLogContext<T>(bindings: LogContext, fn: () => T): T {
  const parent = als.getStore() ?? {};
  return als.run({ ...parent, ...bindings }, fn);
}

export function getLogContext(): LogContext {
  return als.getStore() ?? {};
}