import "server-only";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { weekdayMondayFirst } from "@/lib/dates";
import { requireSession } from "@/lib/session";

export type ExerciseRow = {
  id: number;
  trainingDayId: number;
  position: number;
  name: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  toFailure: boolean;
  notes: string | null;
};

export type TrainingDayRow = {
  id: number;
  weekday: number;
  title: string;
  type: "treino" | "descanso" | "acessorios" | "opcional";
  notes: string | null;
  exercises: ExerciseRow[];
};

/** Plano semanal (segunda → domingo) com os exercícios de cada dia, por ordem. */
export async function getTrainingWeek() {
  await requireSession();
  const db = await getDb();
  const [days, exercises] = await Promise.all([
    db.select().from(schema.trainingDays).orderBy(asc(schema.trainingDays.weekday)),
    db.select().from(schema.exercises).orderBy(asc(schema.exercises.position), asc(schema.exercises.id)),
  ]);

  const week: TrainingDayRow[] = days.map((d) => ({
    id: d.id,
    weekday: d.weekday,
    title: d.title,
    type: d.type,
    notes: d.notes,
    exercises: exercises
      .filter((e) => e.trainingDayId === d.id)
      .map(({ createdAt: _c, updatedAt: _u, ...e }) => e),
  }));

  return { week, todayWeekday: weekdayMondayFirst() };
}
