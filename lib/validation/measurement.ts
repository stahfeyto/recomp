import { z } from "zod";
import { MEASURES, type MeasureKey } from "../measures";
import { parseDecimal } from "../number";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type MeasurementInput = {
  date: string;
  strengthDropping: boolean | null;
  notes: string | null;
} & Record<MeasureKey, number | null>;

export type FieldErrors = Partial<Record<MeasureKey | "date" | "notes" | "form", string>>;

function validDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Lê um registo de medidas de um FormData. Números aceitam vírgula ou ponto.
 * Só devolve os campos que VÊM no formulário (`provided`): o que não vem não é
 * tocado ao gravar (ex.: o peso antigo de um registo, que o formulário já não mostra).
 * Devolve os erros por campo (mensagens em PT) em vez de lançar.
 */
export function parseMeasurementForm(
  fd: FormData,
): { ok: true; data: Partial<MeasurementInput> & { date: string }; provided: string[] } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const date = String(fd.get("date") ?? "").trim();
  if (!validDate(date)) errors.date = "Escolhe uma data válida.";

  const values: Partial<Record<MeasureKey, number | null>> = {};
  const provided: string[] = [];
  let filled = 0;
  for (const m of MEASURES) {
    if (!fd.has(m.key)) continue;
    provided.push(m.key);
    const raw = String(fd.get(m.key) ?? "").trim();
    if (raw === "") {
      values[m.key] = null;
      continue;
    }
    const n = parseDecimal(raw);
    if (n === null) {
      errors[m.key] = `Escreve um número, por exemplo ${m.unit === "kg" ? "65,4" : "83,5"}.`;
    } else if (n < m.min || n > m.max) {
      errors[m.key] = `Entre ${m.min} e ${m.max} ${m.unit}.`;
    } else {
      values[m.key] = Math.round(n * 100) / 100;
      filled++;
    }
  }

  const extra: Partial<Pick<MeasurementInput, "strengthDropping" | "notes">> = {};
  if (fd.has("strength")) {
    provided.push("strengthDropping");
    const strengthRaw = String(fd.get("strength") ?? "");
    extra.strengthDropping = strengthRaw === "sim" ? true : strengthRaw === "nao" ? false : null;
    if (extra.strengthDropping !== null) filled++;
  }
  if (fd.has("notes")) {
    provided.push("notes");
    const notesRaw = String(fd.get("notes") ?? "").trim();
    if (notesRaw.length > 1000) errors.notes = "Máximo de 1000 caracteres.";
    extra.notes = notesRaw || null;
  }

  if (filled === 0 && Object.keys(errors).length === 0) {
    errors.form = "Preenche pelo menos uma medida.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { date, ...values, ...extra }, provided };
}

export type TodayInput = { date: string; weightKg: number | null; waistCm: number | null };

/** Registo rápido do dia: peso e/ou cintura (pelo menos um). */
export function parseTodayForm(
  fd: FormData,
): { ok: true; data: TodayInput } | { ok: false; errors: Partial<Record<"date" | "weightKg" | "waistCm" | "form", string>> } {
  const errors: Partial<Record<"date" | "weightKg" | "waistCm" | "form", string>> = {};
  const date = String(fd.get("date") ?? "").trim();
  if (!validDate(date)) errors.date = "Escolhe uma data válida.";

  const read = (key: "weightKg" | "waistCm", min: number, max: number, unit: string, eg: string) => {
    const raw = String(fd.get(key) ?? "").trim();
    if (raw === "") return null;
    const n = parseDecimal(raw);
    if (n === null) {
      errors[key] = `Escreve um número, por exemplo ${eg}.`;
      return null;
    }
    if (n < min || n > max) {
      errors[key] = `Entre ${min} e ${max} ${unit}.`;
      return null;
    }
    return Math.round(n * 100) / 100;
  };
  const weightKg = read("weightKg", 30, 250, "kg", "65,4");
  const waistCm = read("waistCm", 40, 200, "cm", "83,5");
  if (weightKg === null && waistCm === null && Object.keys(errors).length === 0) {
    errors.form = "Escreve o peso, a cintura ou os dois.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { date, weightKg, waistCm } };
}

const measureNumber = z.number().finite().nullable();

/** Para repor um registo apagado ("Anular"): nunca se confia no que vem do cliente. */
export const restoreMeasurementSchema = z.object({
  date: z.string().regex(ISO_DATE),
  weightKg: measureNumber,
  waistCm: measureNumber,
  chestCm: measureNumber,
  shouldersCm: measureNumber,
  armRightCm: measureNumber,
  armLeftCm: measureNumber,
  thighCm: measureNumber,
  calfCm: measureNumber,
  neckCm: measureNumber,
  strengthDropping: z.boolean().nullable(),
  notes: z.string().max(1000).nullable(),
});

export const dailyWeightSchema = z.object({
  date: z.string().regex(ISO_DATE).refine(validDate, "Escolhe uma data válida."),
  weightKg: z.number().min(30, "Entre 30 e 250 kg.").max(250, "Entre 30 e 250 kg."),
});
