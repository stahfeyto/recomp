import "server-only";
import { asc, desc, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  armAverage,
  dueMeasures,
  greeting,
  nextCheckIn,
  ratio,
  seriesSummary,
  shiftISODate,
  weightWeeks,
  type Point,
} from "@/lib/calculations";
import { lisbonHour, todayISO, weekdayMondayFirst } from "@/lib/dates";
import { requireSession } from "@/lib/session";

/** Tudo o que o Painel precisa, numa ida à BD (consultas em paralelo). */
export async function getDashboardData() {
  await requireSession();
  const db = await getDb();
  const today = todayISO();
  const weekday = weekdayMondayFirst();
  const since = shiftISODate(today, -70);

  const [profileRows, measurements, weights, goals, days] = await Promise.all([
    db.select().from(schema.profile).limit(1),
    db.select().from(schema.measurements).orderBy(asc(schema.measurements.date)),
    db
      .select({ date: schema.dailyWeights.date, weightKg: schema.dailyWeights.weightKg })
      .from(schema.dailyWeights)
      .where(gte(schema.dailyWeights.date, since))
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

  // KPIs
  const waist = seriesSummary(measurements, (r) => r.waistCm);
  const chest = seriesSummary(measurements, (r) => r.chestCm);
  const shoulders = seriesSummary(measurements, (r) => r.shouldersCm);
  const arm = seriesSummary(measurements, armAverage);
  const weightMeasured = seriesSummary(measurements, (r) => r.weightKg);
  const weeks = weightWeeks(weights, today);
  const lastArms = [...measurements]
    .reverse()
    .find((r) => typeof r.armRightCm === "number" && typeof r.armLeftCm === "number");

  // Peso: média dos últimos 7 dias se houver pesagens; senão a última medição.
  const weight = weeks.current
    ? {
        source: "media" as const,
        current: weeks.current.average,
        count: weeks.current.count,
        previous: weeks.previous?.average ?? weightMeasured?.previous?.value ?? null,
        first: weightMeasured?.first.value ?? null,
      }
    : weightMeasured
      ? {
          source: "medicao" as const,
          current: weightMeasured.current.value,
          count: 0,
          previous: weightMeasured.previous?.value ?? null,
          first: weightMeasured.first.value,
        }
      : null;

  // Sparklines das últimas 8 semanas
  const from56 = shiftISODate(today, -56);
  const waistSpark: Point[] = measurements
    .filter((r) => r.date >= from56 && typeof r.waistCm === "number")
    .map((r) => ({ date: r.date, value: r.waistCm! }));
  const weightSpark: Point[] = (
    weights.length >= 2
      ? weights.filter((w) => w.date >= from56).map((w) => ({ date: w.date, value: w.weightKg }))
      : measurements
          .filter((r) => r.date >= from56 && typeof r.weightKg === "number")
          .map((r) => ({ date: r.date, value: r.weightKg! }))
  );

  const heightCm = profile?.heightCm ?? null;

  return {
    today,
    weekday,
    greeting: greeting(lisbonHour()),
    name: profile?.displayName ?? "Helder",
    heightCm,
    weight,
    waist,
    chest,
    shoulders,
    arm,
    armSides: lastArms ? { right: lastArms.armRightCm!, left: lastArms.armLeftCm!, date: lastArms.date } : null,
    shoulderWaist:
      shoulders && waist ? ratio(shoulders.current.value, waist.current.value) : null,
    waistHeight: waist && heightCm ? ratio(waist.current.value, heightCm) : null,
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
    due: dueMeasures(measurements, today),
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
    waistSpark,
    weightSpark,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
