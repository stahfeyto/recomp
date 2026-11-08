import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type DB = NeonHttpDatabase<typeof schema>;

let instance: Promise<DB> | undefined;

/**
 * Cliente Drizzle, criado na primeira utilização.
 *
 * - Produção / Neon: `DATABASE_URL=postgres://…` (driver HTTP serverless).
 * - Desenvolvimento sem Neon: `DATABASE_URL=pglite:.pglite` usa um Postgres local
 *   em WebAssembly guardado na pasta indicada (não commitada). Só para testes locais.
 */
export function getDb(): Promise<DB> {
  instance ??= createDb();
  return instance;
}

async function createDb(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não está definida. Preenche o .env.local (ver .env.example).",
    );
  }

  if (url.startsWith("pglite:")) {
    const dir = url.slice("pglite:".length) || ".pglite";
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
    // A API de consultas é a mesma; o tipo Neon é usado em toda a app.
    return drizzlePglite(new PGlite(dir), { schema }) as unknown as DB;
  }

  return drizzle(neon(url), { schema });
}

export { schema };
