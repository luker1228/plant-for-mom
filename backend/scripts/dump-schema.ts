import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { printSchema } from "graphql";
import { schema } from "../src/graphql/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../../shared/schema.graphql");
const sdl = printSchema(schema);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, sdl);
console.log(`Schema written to ${outPath}`);
