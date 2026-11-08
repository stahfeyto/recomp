import "server-only";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { lastKnownValues, weeklyAverage } from "@/lib/calculations";
import { todayISO } from "@/lib/dates";
import { requireSession } from "@/lib/session";

/** Registo semanal no formato enviado aos componentes de cliente (sem timestamps). */
export type MeasurementRow = Omit<
  typeof schema.measurements.$inferSelect,
  "createdAt" | "updatedAt"
>;
export type DailyWeightRow = Omit<typeof schema.dailyWeights.$inferSelect, "createdAt">;

export async function getMeasurementsPageData() {
  await requireSession();
  const db = await getDb();

  const [measurementRows, weightRows] = await Promise.all([
    db.select().from(schema.measurements).orderBy(desc(schema.measurements.date)),
    db.select().from(schema.dailyWeights).orderBy(desc(schema.dailyWeights.date)).limit(60),
  ]);

  const measurements: MeasurementRow[] = measurementRows.map(
    ({ createdAt: _c, updatedAt: _u, ...rest }) => rest,
  );
  const dailyWeights: DailyWeightRow[] = weightRows.map(({ createdAt: _c, ...rest }) => rest);
  const today = todayISO();

  return {
    today,
    measurements,
    dailyWeights,
    lastValues: lastKnownValues(measurements),
    weekly: weeklyAverage(dailyWeights, today),
    todayWeight: dailyWeights.find((w) => w.date === today) ?? null,
  };
}

export type MeasurementsPageData = Awaited<ReturnType<typeof getMeasurementsPageData>>;
