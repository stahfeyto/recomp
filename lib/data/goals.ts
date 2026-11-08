import "server-only";
import { asc, desc, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { shiftISODate, weeklyAverage } from "@/lib/calculations";
import { todayISO } from "@/lib/dates";
import { recommend } from "@/lib/recomp-rules";
import { requireSession } from "@/lib/session";

/** Lê o necessário para a recomendação (usado pela página e pela ação "Aplicar"). */
export async function loadCheckInInputs() {
  const db = await getDb();
  const today = todayISO();
  const [goals, measurements, weights] = await Promise.all([
    db.select().from(schema.nutritionGoals).orderBy(desc(schema.nutritionGoals.effectiveFrom), desc(schema.nutritionGoals.id)),
    db
      .select({
        date: schema.measurements.date,
        waistCm: schema.measurements.waistCm,
        armRightCm: schema.measurements.armRightCm,
        armLeftCm: schema.measurements.armLeftCm,
        weightKg: schema.measurements.weightKg,
        strengthDropping: schema.measurements.strengthDropping,
      })
      .from(schema.measurements)
      .orderBy(asc(schema.measurements.date)),
    db
      .select({ date: schema.dailyWeights.date, weightKg: schema.dailyWeights.weightKg })
      .from(schema.dailyWeights)
      .where(gte(schema.dailyWeights.date, shiftISODate(today, -13))),
  ]);

  const active = goals.find((g) => g.effectiveFrom <= today) ?? null;
  const recommendation = recommend(measurements, active?.effectiveFrom ?? null, today);
  const lastWeight = [...measurements].reverse().find((m) => typeof m.weightKg === "number")?.weightKg ?? null;
  const weightKg = weeklyAverage(weights, today)?.average ?? lastWeight;

  return { today, goals, active, recommendation, weightKg };
}

export async function getGoalsPageData() {
  await requireSession();
  const { today, goals, active, recommendation, weightKg } = await loadCheckInInputs();
  return {
    today,
    weightKg,
    recommendation,
    active: active
      ? {
          id: active.id,
          label: active.label,
          effectiveFrom: active.effectiveFrom,
          calories: active.calories,
          proteinG: active.proteinG,
          carbsG: active.carbsG,
          fatG: active.fatG,
        }
      : null,
    history: goals.map((g) => ({
      id: g.id,
      label: g.label,
      effectiveFrom: g.effectiveFrom,
      calories: g.calories,
      proteinG: g.proteinG,
      carbsG: g.carbsG,
      fatG: g.fatG,
      notes: g.notes,
      source: g.source,
    })),
  };
}

export type GoalsPageData = Awaited<ReturnType<typeof getGoalsPageData>>;
