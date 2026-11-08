"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { loadCheckInInputs } from "@/lib/data/goals";
import { formatDate } from "@/lib/format";
import { applyAdjustment } from "@/lib/recomp-rules";
import { requireSession } from "@/lib/session";

export type SaveGoalState = {
  status: "idle" | "ok" | "error";
  nonce: number;
  errors?: Partial<Record<"label" | "effectiveFrom" | "calories" | "proteinG" | "carbsG" | "fatG" | "notes" | "form", string>>;
  message?: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const goalSchema = z.object({
  label: z.string().trim().min(1, "Dá um nome à meta.").max(40, "Máximo de 40 caracteres."),
  effectiveFrom: z.string().regex(ISO_DATE, "Escolhe uma data válida."),
  calories: z.coerce.number().int("Só números inteiros.").min(800, "Entre 800 e 6000 kcal.").max(6000, "Entre 800 e 6000 kcal."),
  proteinG: z.coerce.number().int("Só números inteiros.").min(0).max(400, "Máximo de 400 g."),
  carbsG: z.coerce.number().int("Só números inteiros.").min(0).max(800, "Máximo de 800 g."),
  fatG: z.coerce.number().int("Só números inteiros.").min(0).max(300, "Máximo de 300 g."),
  notes: z.string().trim().max(500, "Máximo de 500 caracteres.").optional(),
});

/**
 * Guarda uma nova meta (o histórico nunca é sobrescrito). A exceção é corrigir uma
 * meta com o mesmo nome na mesma data de início: aí atualiza essa entrada.
 */
export async function saveGoal(prev: SaveGoalState, formData: FormData): Promise<SaveGoalState> {
  await requireSession();
  const nonce = prev.nonce + 1;

  const parsed = goalSchema.safeParse({
    label: formData.get("label"),
    effectiveFrom: formData.get("effectiveFrom"),
    calories: formData.get("calories"),
    proteinG: formData.get("proteinG"),
    carbsG: formData.get("carbsG"),
    fatG: formData.get("fatG"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    const errors: SaveGoalState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as keyof NonNullable<SaveGoalState["errors"]>;
      errors[k] ??= issue.message;
    }
    return { status: "error", nonce, errors };
  }
  const v = parsed.data;

  try {
    const db = await getDb();
    const [existing] = await db
      .select({ id: schema.nutritionGoals.id })
      .from(schema.nutritionGoals)
      .where(and(eq(schema.nutritionGoals.effectiveFrom, v.effectiveFrom), eq(schema.nutritionGoals.label, v.label)))
      .limit(1);

    const values = {
      label: v.label,
      effectiveFrom: v.effectiveFrom,
      calories: v.calories,
      proteinG: v.proteinG,
      carbsG: v.carbsG,
      fatG: v.fatG,
      notes: v.notes || null,
      source: "manual" as const,
    };

    if (existing) {
      await db.update(schema.nutritionGoals).set(values).where(eq(schema.nutritionGoals.id, existing.id));
    } else {
      await db.insert(schema.nutritionGoals).values(values);
    }
    refresh();
    return {
      status: "ok",
      nonce,
      message: existing
        ? `Meta "${v.label}" de ${formatDate(v.effectiveFrom)} atualizada`
        : `Nova meta em vigor desde ${formatDate(v.effectiveFrom)}`,
    };
  } catch (err) {
    console.error("[saveGoal]", err);
    return { status: "error", nonce, errors: { form: "Não foi possível guardar. Tenta de novo." } };
  }
}

export type ApplyResult = { ok: boolean; message: string };

/**
 * "Aplicar às metas": recalcula a recomendação no servidor (não confia no cliente) e
 * cria uma nova meta a partir de hoje com o ajuste. O próximo check-in passa a ser
 * daqui a 21 dias.
 */
export async function applyRecommendation(): Promise<ApplyResult> {
  await requireSession();
  try {
    const { today, active, recommendation } = await loadCheckInInputs();
    if (!active) return { ok: false, message: "Não há nenhuma meta em vigor." };
    if (!recommendation.due) {
      return { ok: false, message: `O check-in ainda não chegou (faltam ${recommendation.daysUntilDue} dias).` };
    }
    if (!recommendation.adjustment) return { ok: false, message: "Esta recomendação não pede ajustes." };

    const next = applyAdjustment(active, recommendation.adjustment);
    const db = await getDb();
    const inserted = await db
      .insert(schema.nutritionGoals)
      .values({
        label: active.label,
        effectiveFrom: today,
        ...next,
        notes: `Ajuste do assistente: ${recommendation.title}. ${recommendation.message}`,
        source: "assistente",
      })
      .onConflictDoNothing()
      .returning({ id: schema.nutritionGoals.id });
    if (inserted.length === 0) {
      return { ok: false, message: `Já existe uma meta "${active.label}" a começar hoje.` };
    }
    refresh();
    return {
      ok: true,
      message: `Metas ajustadas: ${active.calories} → ${next.calories} kcal. Próximo check-in daqui a 21 dias.`,
    };
  } catch (err) {
    console.error("[applyRecommendation]", err);
    return { ok: false, message: "Não foi possível aplicar. Tenta de novo." };
  }
}
