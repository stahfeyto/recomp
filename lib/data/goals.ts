import "server-only";
import { asc, desc, gte, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { todayISO } from "@/lib/dates";
import { currentWindow, seriesOf, shiftISODate, weekStart, weightSeries } from "@/lib/metrics";
import { recommend } from "@/lib/recomp-rules";
import { requireSession } from "@/lib/session";

export type WeekFlag = { weekStart: string; atypical: boolean; reason: string | null };

/**
 * Marcas de "semana atípica". Se a tabela ainda não existir nesta base (migração
 * por aplicar), devolve vazio em vez de partir a página.
 */
async function readWeekFlags(weeks: string[]): Promise<WeekFlag[]> {
  try {
    const db = await getDb();
    const rows = await db
      .select({ weekStart: schema.checkinWeeks.weekStart, atypical: schema.checkinWeeks.atypical, reason: schema.checkinWeeks.reason })
      .from(schema.checkinWeeks)
      .where(inArray(schema.checkinWeeks.weekStart, weeks));
    return rows;
  } catch (err) {
    console.warn("[checkin_weeks] indisponível:", err instanceof Error ? err.message : err);
    return [];
  }
}

/** Lê o necessário para a recomendação (usado pela página e pela ação "Aplicar"). */
export async function loadCheckInInputs() {
  const db = await getDb();
  const today = todayISO();
  const [goals, measurements, dailyWeights] = await Promise.all([
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
      .where(gte(schema.dailyWeights.date, shiftISODate(today, -120))),
  ]);

  const active = goals.find((g) => g.effectiveFrom <= today) ?? null;
  const weights = weightSeries(dailyWeights, measurements);

  // Semana atual (a de hoje) e a semana da última cintura medida.
  const lastWaist = seriesOf(measurements, (r) => r.waistCm).filter((p) => p.date <= today).at(-1);
  const thisWeek = weekStart(today);
  const weeks = [...new Set([thisWeek, ...(lastWaist ? [weekStart(lastWaist.date)] : [])])];
  const flags = await readWeekFlags(weeks);
  const currentFlag = flags.find((f) => f.weekStart === thisWeek) ?? { weekStart: thisWeek, atypical: false, reason: null };
  const atypicalWeek = flags.some((f) => f.atypical);

  const recommendation = recommend({
    measurements,
    weights,
    lastGoalDate: active?.effectiveFrom ?? null,
    today,
    atypicalWeek,
  });

  return {
    today,
    goals,
    active,
    recommendation,
    weightKg: currentWindow(weights, today)?.value ?? null,
    currentWeek: currentFlag,
  };
}

export async function getGoalsPageData() {
  await requireSession();
  const { today, goals, active, recommendation, weightKg, currentWeek } = await loadCheckInInputs();
  return {
    today,
    weightKg,
    recommendation,
    currentWeek,
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
