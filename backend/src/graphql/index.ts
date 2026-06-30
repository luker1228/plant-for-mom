import "./scalars.js";
import "./types.js";
import "./resolvers.js";
import { builder } from "./builder.js";

export const schema = builder.toSchema();
export { builder } from "./builder.js";