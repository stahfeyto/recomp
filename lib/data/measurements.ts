import "server-only";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { lastKnownValues } from "@/lib/calculations";
import { todayISO } from "@/lib/dates";
import { currentWindow, lastAt, seriesOf, shiftISODate, weightSeries, streakDays } from "@/lib/metrics";
import { requireSession } from "@/lib/session";

/** Registo de medidas no formato enviado aos componentes de cliente (sem timestamps). */
export type MeasurementRow = Omit<typeof schema.measurements.$inferSelect, "createdAt" | "updatedAt">;
export type DailyWeightRow = Omit<typeof schema.dailyWeights.$inferSelect, "createdAt">;

async function loadAll() {
  const db = await getDb();
  const [measurementRows, weightRows] = await Promise.all([
    db.select().from(schema.measurements).orderBy(desc(schema.measurements.date)),
    db.select().from(schema.dailyWeights).orderBy(desc(schema.dailyWeights.date)).limit(400),
  ]);
  const measurements: MeasurementRow[] = measurementRows.map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest);
  const dailyWeights: DailyWeightRow[] = weightRows.map(({ createdAt: _c, ...rest }) => rest);
  return { measurements, dailyWeights };
}

/** Histórico (página Medidas): registos, pesagens e últimos valores para o formulário de edição. */
export async function getMeasurementsPageData() {
  await requireSession();
  const { measurements, dailyWeights } = await loadAll();
  const today = todayISO();
  const weights = weightSeries(dailyWeights, measurements);
  return {
    today,
    measurements,
    dailyWeights,
    lastValues: lastKnownValues(measurements),
    weekly: currentWindow(weights, today),
    todayWeight: dailyWeights.find((w) => w.date === today) ?? null,
  };
}

export type MeasurementsPageData = Awaited<ReturnType<typeof getMeasurementsPageData>>;

/** "Registar hoje": valores de hoje e de ontem, último valor e médias de 7 dias. */
export async function getTodayData() {
  await requireSession();
  const { measurements, dailyWeights } = await loadAll();
  const today = todayISO();
  const yesterday = shiftISODate(today, -1);
  const weights = weightSeries(dailyWeights, measurements);
  const waists = seriesOf(measurements, (r) => r.waistCm);

  const valueOn = (pts: typeof weights, date: string) => pts.find((p) => p.date === date)?.value ?? null;
  // Dias seguidos com registo (só para mostrar; não entra em cálculos).
  const streak = streakDays(
    [
      ...measurements.filter((m) => m.waistCm != null || m.weightKg != null).map((m) => m.date),
      ...dailyWeights.map((w) => w.date),
    ],
    today,
  );

  return {
    today,
    streak,
    weight: {
      today: dailyWeights.find((w) => w.date === today)?.weightKg ?? null,
      yesterday: valueOn(weights, yesterday),
      last: lastAt(weights, today),
      week: currentWindow(weights, today),
    },
    waist: {
      today: valueOn(waists, today),
      yesterday: valueOn(waists, yesterday),
      last: lastAt(waists, today),
      week: currentWindow(waists, today),
    },
    /** Últimos valores das medidas semanais (dicas do formulário completo). */
    lastValues: lastKnownValues(measurements),
  };
}

export type TodayData = Awaited<ReturnType<typeof getTodayData>>;
