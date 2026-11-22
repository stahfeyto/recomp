import "server-only";
import { asc, desc, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { dueMeasures, greeting, nextCheckIn } from "@/lib/calculations";
import { lisbonHour, todayISO, weekdayMondayFirst } from "@/lib/dates";
import {
  armAverage,
  averagedSummary,
  movingAverage,
  ratio,
  seriesOf,
  shiftISODate,
  slowSummary,
  weightSeries,
  type Point,
  streakDays,
} from "@/lib/metrics";
import { requireSession } from "@/lib/session";

/** Tudo o que o Painel precisa; os cálculos vêm todos de lib/metrics.ts. */
export async function getDashboardData() {
  await requireSession();
  const db = await getDb();
  const today = todayISO();
  const weekday = weekdayMondayFirst();

  const [profileRows, measurements, dailyWeights, goals, days] = await Promise.all([
    db.select().from(schema.profile).limit(1),
    db.select().from(schema.measurements).orderBy(asc(schema.measurements.date)),
    db
      .select({ date: schema.dailyWeights.date, weightKg: schema.dailyWeights.weightKg })
      .from(schema.dailyWeights)
      .where(gte(schema.dailyWeights.date, shiftISODate(today, -400)))
      .orderBy(asc(schema.dailyWeights.date)),
    db.select().from(schema.nutritionGoals).orderBy(desc(schema.nutritionGoals.effectiveFrom)),
    db.select().from(schema.trainingDays).where(eq(schema.trainingDays.weekday, weekday)).limit(1),
  ]);

  const day = days[0] ?? null;
  const exercises = day
    ? await db
        .select()
        .from(schema.exercises)
        .where(eq(schema.exercises.trainingDayId, day.id))
        .orderBy(asc(schema.exercises.position))
    : [];

  const profile = profileRows[0] ?? null;
  const activeGoal = goals.find((g) => g.effectiveFrom <= today) ?? null;

  const waistPts = seriesOf(measurements, (r) => r.waistCm);
  const weightPts = weightSeries(dailyWeights, measurements);
  const waist = averagedSummary(waistPts, today, "cm");
  const weight = averagedSummary(weightPts, today, "kg");
  const arm = slowSummary(seriesOf(measurements, armAverage), today);
  const chest = slowSummary(seriesOf(measurements, (r) => r.chestCm), today);
  const shoulders = slowSummary(seriesOf(measurements, (r) => r.shouldersCm), today);
  const lastArms = [...measurements]
    .reverse()
    .find((r) => typeof r.armRightCm === "number" && typeof r.armLeftCm === "number");

  // Mini-gráficos das últimas 8 semanas: a linha da média de 7 dias.
  const from56 = shiftISODate(today, -56);
  const spark = (pts: Point[]) => movingAverage(pts).filter((p) => p.date >= from56 && p.date <= today);

  const heightCm = profile?.heightCm ?? null;
  const waistNow = waist?.current.value ?? null;

  return {
    today,
    weekday,
    greeting: greeting(lisbonHour()),
    name: profile?.displayName ?? "Helder",
    heightCm,
    waist,
    weight,
    arm,
    chest,
    shoulders,
    armSides: lastArms ? { right: lastArms.armRightCm!, left: lastArms.armLeftCm!, date: lastArms.date } : null,
    shoulderWaist: shoulders && waistNow ? ratio(shoulders.latest.value, waistNow) : null,
    waistHeight: waistNow && heightCm ? ratio(waistNow, heightCm) : null,
    activeGoal: activeGoal
      ? {
          label: activeGoal.label,
          calories: activeGoal.calories,
          proteinG: activeGoal.proteinG,
          carbsG: activeGoal.carbsG,
          fatG: activeGoal.fatG,
          effectiveFrom: activeGoal.effectiveFrom,
        }
      : null,
    checkIn: nextCheckIn(
      goals.map((g) => g.effectiveFrom),
      today,
    ),
    due: {
      ...dueMeasures(measurements, today),
      weightToday: dailyWeights.some((w) => w.date === today),
    },
    // Dias seguidos com registo (só para mostrar; não entra em cálculos).
    streak: streakDays(
      [
        ...measurements.filter((m) => m.waistCm != null || m.weightKg != null).map((m) => m.date),
        ...dailyWeights.map((w) => w.date),
      ],
      today,
    ),
    training: day
      ? {
          title: day.title,
          type: day.type,
          notes: day.notes,
          exercises: exercises.map((e) => ({
            id: e.id,
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            toFailure: e.toFailure,
          })),
        }
      : null,
    waistSpark: spark(waistPts),
    weightSpark: spark(weightPts),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
