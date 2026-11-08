"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema } from "@/db";
import { detectRecords, type RecordHit } from "@/lib/calculations";
import { formatDate } from "@/lib/format";
import type { DailyWeightRow, MeasurementRow } from "@/lib/data/measurements";
import { parseDecimal } from "@/lib/number";
import { requireSession } from "@/lib/session";
import {
  dailyWeightSchema,
  parseMeasurementForm,
  restoreMeasurementSchema,
  type FieldErrors,
} from "@/lib/validation/measurement";

export type SaveMeasurementState = {
  status: "idle" | "ok" | "error";
  /** Muda a cada resposta, para os efeitos no cliente (toast, celebração). */
  nonce: number;
  errors?: FieldErrors;
  message?: string;
  records?: RecordHit[];
};

const MEASURE_COLUMNS = [
  "weightKg",
  "waistCm",
  "chestCm",
  "shouldersCm",
  "armRightCm",
  "armLeftCm",
  "thighCm",
  "calfCm",
  "neckCm",
] as const;

/**
 * Cria ou edita um registo semanal.
 * - Sem `id`: se já existir um registo nessa data, junta-lhe só os campos preenchidos
 *   (ex.: cintura de manhã, braços à noite).
 * - Com `id`: substitui o registo (campos vazios ficam vazios).
 */
export async function saveMeasurement(
  prev: SaveMeasurementState,
  formData: FormData,
): Promise<SaveMeasurementState> {
  await requireSession();
  const nonce = prev.nonce + 1;

  const parsed = parseMeasurementForm(formData);
  if (!parsed.ok) return { status: "error", nonce, errors: parsed.errors };
  const data = parsed.data;

  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;
  const db = await getDb();

  try {
    let savedId: number;
    let message: string;
    // O registo antes desta gravação (edição ou junção), para não repetir recordes.
    let before: typeof schema.measurements.$inferSelect | null = null;

    if (id) {
      const clash = await db
        .select({ id: schema.measurements.id })
        .from(schema.measurements)
        .where(and(eq(schema.measurements.date, data.date), ne(schema.measurements.id, id)))
        .limit(1);
      if (clash.length > 0) {
        return {
          status: "error",
          nonce,
          errors: { date: `Já existe um registo em ${formatDate(data.date)}.` },
        };
      }
      [before] = await db
        .select()
        .from(schema.measurements)
        .where(eq(schema.measurements.id, id))
        .limit(1);
      const updated = await db
        .update(schema.measurements)
        .set(data)
        .where(eq(schema.measurements.id, id))
        .returning({ id: schema.measurements.id });
      if (updated.length === 0) {
        return { status: "error", nonce, errors: { form: "Este registo já não existe." } };
      }
      savedId = id;
      message = "Registo atualizado";
    } else {
      const [existing] = await db
        .select()
        .from(schema.measurements)
        .where(eq(schema.measurements.date, data.date))
        .limit(1);

      if (existing) {
        before = existing;
        const patch: Partial<typeof data> = {};
        for (const key of MEASURE_COLUMNS) if (data[key] !== null) patch[key] = data[key];
        if (data.strengthDropping !== null) patch.strengthDropping = data.strengthDropping;
        if (data.notes) patch.notes = existing.notes ? `${existing.notes}\n${data.notes}` : data.notes;
        await db.update(schema.measurements).set(patch).where(eq(schema.measurements.id, existing.id));
        savedId = existing.id;
        message = `Registo de ${formatDate(data.date)} atualizado`;
      } else {
        const [row] = await db
          .insert(schema.measurements)
          .values(data)
          .returning({ id: schema.measurements.id });
        savedId = row.id;
        message = "Medição guardada";
      }
    }

    const all = await db.select().from(schema.measurements);
    const saved = all.find((r) => r.id === savedId)!;
    const records = detectRecords(
      saved,
      all.filter((r) => r.id !== savedId),
      before,
    );

    refresh();
    return { status: "ok", nonce, message, records };
  } catch (err) {
    console.error("[saveMeasurement]", err);
    return {
      status: "error",
      nonce,
      errors: { form: "Não foi possível guardar. Tenta de novo." },
    };
  }
}

/** Apaga e devolve o registo, para o "Anular" do toast o poder repor. */
export async function deleteMeasurement(id: number): Promise<MeasurementRow | null> {
  await requireSession();
  const db = await getDb();
  const [row] = await db
    .delete(schema.measurements)
    .where(eq(schema.measurements.id, id))
    .returning();
  refresh();
  if (!row) return null;
  const { createdAt: _c, updatedAt: _u, ...rest } = row;
  return rest;
}

export async function restoreMeasurement(row: MeasurementRow): Promise<boolean> {
  await requireSession();
  const parsed = restoreMeasurementSchema.safeParse(row);
  if (!parsed.success) return false;
  const db = await getDb();
  const inserted = await db
    .insert(schema.measurements)
    .values(parsed.data)
    .onConflictDoNothing()
    .returning({ id: schema.measurements.id });
  refresh();
  return inserted.length > 0;
}

/* ------------------------------------------------------------ pesagem diária */

export type SaveDailyWeightState = {
  status: "idle" | "ok" | "error";
  nonce: number;
  errors?: { date?: string; weightKg?: string; form?: string };
  message?: string;
};

/** Grava a pesagem do dia; se já houver uma nessa data, substitui-a. */
export async function saveDailyWeight(
  prev: SaveDailyWeightState,
  formData: FormData,
): Promise<SaveDailyWeightState> {
  await requireSession();
  const nonce = prev.nonce + 1;

  const weight = parseDecimal(String(formData.get("weightKg") ?? ""));
  if (weight === null) {
    return { status: "error", nonce, errors: { weightKg: "Escreve o peso, por exemplo 65,4." } };
  }
  const parsed = dailyWeightSchema.safeParse({
    date: String(formData.get("date") ?? ""),
    weightKg: Math.round(weight * 100) / 100,
  });
  if (!parsed.success) {
    const errors: SaveDailyWeightState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as "date" | "weightKg";
      errors[k] ??= k === "date" ? "Escolhe uma data válida." : issue.message;
    }
    return { status: "error", nonce, errors };
  }

  try {
    const db = await getDb();
    const [existing] = await db
      .select({ id: schema.dailyWeights.id })
      .from(schema.dailyWeights)
      .where(eq(schema.dailyWeights.date, parsed.data.date))
      .limit(1);
    await db
      .insert(schema.dailyWeights)
      .values(parsed.data)
      .onConflictDoUpdate({
        target: schema.dailyWeights.date,
        set: { weightKg: parsed.data.weightKg },
      });
    refresh();
    return {
      status: "ok",
      nonce,
      message: existing ? "Pesagem atualizada" : "Pesagem guardada",
    };
  } catch (err) {
    console.error("[saveDailyWeight]", err);
    return { status: "error", nonce, errors: { form: "Não foi possível guardar. Tenta de novo." } };
  }
}

export async function deleteDailyWeight(id: number): Promise<DailyWeightRow | null> {
  await requireSession();
  const db = await getDb();
  const [row] = await db
    .delete(schema.dailyWeights)
    .where(eq(schema.dailyWeights.id, id))
    .returning();
  refresh();
  if (!row) return null;
  const { createdAt: _c, ...rest } = row;
  return rest;
}

export async function restoreDailyWeight(row: DailyWeightRow): Promise<boolean> {
  await requireSession();
  const parsed = dailyWeightSchema.safeParse({ date: row.date, weightKg: row.weightKg });
  if (!parsed.success) return false;
  const db = await getDb();
  const inserted = await db
    .insert(schema.dailyWeights)
    .values(parsed.data)
    .onConflictDoNothing()
    .returning({ id: schema.dailyWeights.id });
  refresh();
  return inserted.length > 0;
}
