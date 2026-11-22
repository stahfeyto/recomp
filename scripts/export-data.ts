/**
 * Exportação (só leitura) de todas as tabelas para backups/recomp-AAAA-MM-DD-HHMM.json.
 *
 *   npm run db:export                      → base do DATABASE_URL (.env.local)
 *   DATABASE_URL="postgres://…" npm run db:export   → outra base (ex.: produção)
 *
 * A pasta backups/ está no .gitignore: os dados pessoais nunca vão para o git.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getDb, schema } from "../db";

async function main() {
  const db = await getDb();
  const tables = {
    profile: schema.profile,
    measurements: schema.measurements,
    daily_weights: schema.dailyWeights,
    nutrition_goals: schema.nutritionGoals,
    training_days: schema.trainingDays,
    exercises: schema.exercises,
  } as const;

  const data: Record<string, unknown[]> = {};
  for (const [name, table] of Object.entries(tables)) {
    data[name] = await db.select().from(table as never);
  }

  const stamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  mkdirSync("backups", { recursive: true });
  const file = join("backups", `recomp-${stamp}.json`);
  writeFileSync(
    file,
    JSON.stringify({ exportedAt: new Date().toISOString(), tables: data }, null, 2),
  );

  console.log(`Exportado para ${file}`);
  for (const [name, rows] of Object.entries(data)) console.log(`  ${name}: ${rows.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
