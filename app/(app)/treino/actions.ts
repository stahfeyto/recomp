"use server";

import { and, eq, inArray, max, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { ExerciseRow } from "@/lib/data/training";
import { requireSession } from "@/lib/session";

export type FormResult = {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
};

function issuesToErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const i of issues) errors[String(i.path[0])] ??= i.message;
  return errors;
}

/* ------------------------------------------------------------------- dia */

const daySchema = z.object({
  title: z.string().trim().min(1, "Dá um título ao dia.").max(40, "Máximo de 40 caracteres."),
  type: z.enum(["treino", "descanso", "acessorios", "opcional"], { message: "Escolhe o tipo." }),
  notes: z.string().trim().max(200, "Máximo de 200 caracteres."),
});

export async function updateDay(dayId: number, input: { title: string; type: string; notes: string }): Promise<FormResult> {
  await requireSession();
  const parsed = daySchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: issuesToErrors(parsed.error.issues) };
  const db = await getDb();
  await db
    .update(schema.trainingDays)
    .set({ ...parsed.data, notes: parsed.data.notes || null })
    .where(eq(schema.trainingDays.id, dayId));
  refresh();
  return { ok: true, message: "Dia guardado" };
}

/* ------------------------------------------------------------- exercício */

const optionalInt = (min: number, maxV: number, msg: string) =>
  z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : Number(s)))
    .refine((n) => n === null || (Number.isInteger(n) && n >= min && n <= maxV), msg);

const exerciseSchema = z.object({
  name: z.string().trim().min(1, "Escreve o nome do exercício.").max(60, "Máximo de 60 caracteres."),
  sets: optionalInt(1, 20, "Entre 1 e 20 séries."),
  reps: z.string().trim().max(20, "Máximo de 20 caracteres (ex.: 8–12)."),
  restSeconds: optionalInt(0, 600, "Entre 0 e 600 segundos."),
  toFailure: z.boolean(),
  notes: z.string().trim().max(200, "Máximo de 200 caracteres."),
});

export type ExerciseInput = {
  name: string;
  sets: string;
  reps: string;
  restSeconds: string;
  toFailure: boolean;
  notes: string;
};

function toValues(d: z.infer<typeof exerciseSchema>) {
  return {
    name: d.name,
    sets: d.sets,
    reps: d.reps || null,
    restSeconds: d.restSeconds,
    toFailure: d.toFailure,
    notes: d.notes || null,
  };
}

export async function addExercise(dayId: number, input: ExerciseInput): Promise<FormResult> {
  await requireSession();
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: issuesToErrors(parsed.error.issues) };
  const db = await getDb();
  const [{ last }] = await db
    .select({ last: max(schema.exercises.position) })
    .from(schema.exercises)
    .where(eq(schema.exercises.trainingDayId, dayId));
  await db.insert(schema.exercises).values({
    trainingDayId: dayId,
    position: (last ?? -1) + 1,
    ...toValues(parsed.data),
  });
  refresh();
  return { ok: true, message: `${parsed.data.name} adicionado` };
}

export async function updateExercise(id: number, input: ExerciseInput): Promise<FormResult> {
  await requireSession();
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: issuesToErrors(parsed.error.issues) };
  const db = await getDb();
  await db.update(schema.exercises).set(toValues(parsed.data)).where(eq(schema.exercises.id, id));
  refresh();
  return { ok: true, message: "Exercício guardado" };
}

/** Apaga e devolve o exercício, para o "Anular" do toast o poder repor. */
export async function deleteExercise(id: number): Promise<ExerciseRow | null> {
  await requireSession();
  const db = await getDb();
  const [row] = await db.delete(schema.exercises).where(eq(schema.exercises.id, id)).returning();
  refresh();
  if (!row) return null;
  const { createdAt: _c, updatedAt: _u, ...rest } = row;
  return rest;
}

export async function restoreExercise(row: ExerciseRow): Promise<boolean> {
  await requireSession();
  const parsed = exerciseSchema.safeParse({
    name: row.name,
    sets: row.sets === null ? "" : String(row.sets),
    reps: row.reps ?? "",
    restSeconds: row.restSeconds === null ? "" : String(row.restSeconds),
    toFailure: row.toFailure,
    notes: row.notes ?? "",
  });
  if (!parsed.success || !Number.isInteger(row.trainingDayId)) return false;
  const db = await getDb();
  await db.insert(schema.exercises).values({
    trainingDayId: row.trainingDayId,
    position: Number.isInteger(row.position) ? row.position : 0,
    ...toValues(parsed.data),
  });
  refresh();
  return true;
}

/** Nova ordem dos exercícios de um dia (ids pela ordem final), numa só instrução. */
export async function reorderExercises(dayId: number, orderedIds: number[]): Promise<boolean> {
  await requireSession();
  const ids = orderedIds.filter((n) => Number.isInteger(n));
  if (ids.length === 0) return true;
  const db = await getDb();
  const cases = sql.join(
    ids.map((id, i) => sql`when ${id} then ${i}`),
    sql` `,
  );
  await db
    .update(schema.exercises)
    .set({ position: sql`(case ${schema.exercises.id} ${cases} end)::smallint` })
    .where(and(eq(schema.exercises.trainingDayId, dayId), inArray(schema.exercises.id, ids)));
  refresh();
  return true;
}
