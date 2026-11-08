import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config();

const url = process.env.DATABASE_URL ?? "";
const pglite = url.startsWith("pglite:");

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Desenvolvimento local sem Neon: DATABASE_URL=pglite:.pglite
  ...(pglite ? { driver: "pglite" as const } : {}),
  dbCredentials: {
    url: pglite ? url.slice("pglite:".length) || ".pglite" : url,
  },
  strict: true,
  verbose: true,
});
