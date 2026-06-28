import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  OPENAI_VISION_MODEL: z.string().default("gpt-4o"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  process.stderr.write("Invalid environment variables:\n");
  process.stderr.write(JSON.stringify(parsed.error.format(), null, 2) + "\n");
  process.exit(1);
}

export const config = parsed.data;