import { builder } from "./builder.js";

builder.scalarType("DateTime", {
  serialize: (n) => (n instanceof Date ? n.toISOString() : n),
  parseValue: (n) => {
    if (n instanceof Date) return n;
    if (typeof n === "string") return new Date(n);
    if (typeof n === "number") return new Date(n);
    throw new TypeError("Invalid DateTime");
  },
});