import "server-only";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { todayISO } from "@/lib/dates";
import { requireSession } from "@/lib/session";

/** Dados da página Evolução: todo o histórico (é pequeno; os filtros correm no cliente). */
export async function getEvolutionData() {
  await requireSession();
  const db = await getDb();
  const [measurementRows, weights, goals, profileRows] = await Promise.all([
    db.select().from(schema.measurements).orderBy(asc(schema.measurements.date)),
    db
      .select({ date: schema.dailyWeights.date, weightKg: schema.dailyWeights.weightKg })
      .from(schema.dailyWeights)
      .orderBy(asc(schema.dailyWeights.date)),
    db
      .select({
        date: schema.nutritionGoals.effectiveFrom,
        label: schema.nutritionGoals.label,
        calories: schema.nutritionGoals.calories,
      })
      .from(schema.nutritionGoals)
      .orderBy(asc(schema.nutritionGoals.effectiveFrom)),
    db.select({ heightCm: schema.profile.heightCm }).from(schema.profile).limit(1),
  ]);

  return {
    today: todayISO(),
    measurements: measurementRows.map(({ createdAt: _c, updatedAt: _u, notes: _n, ...rest }) => rest),
    weights,
    goals,
    heightCm: profileRows[0]?.heightCm ?? null,
  };
}

export type EvolutionData = Awaited<ReturnType<typeof getEvolutionData>>;
export type EvolutionMeasurement = EvolutionData["measurements"][number];
