import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = ReturnType<typeof createDb>;

function createDb(url: string) {
  return drizzle(neon(url), { schema });
}

let instance: DB | undefined;

/** Cliente Drizzle (HTTP serverless da Neon), criado na primeira utilização. */
export function getDb(): DB {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL não está definida. Preenche o .env.local (ver .env.example).",
      );
    }
    instance = createDb(url);
  }
  return instance;
}

export { schema };
