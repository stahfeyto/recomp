/**
 * Cálculos puros (sem BD nem datas do sistema): testados na fase 10.
 */
import { EQUAL_THRESHOLD_CM, MEASURE_BY_KEY, type MeasureKey } from "./measures";

export type MeasurementLike = { date: string } & Partial<Record<MeasureKey, number | null>>;
export type DailyWeightLike = { date: string; weightKg: number };

export type Tone = "good" | "bad" | "same" | "neutral";

/** Arredonda a 1 casa decimal (evita 83.49999…). */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Variação com juízo para a recomposição (cintura a descer = bom, braço a descer = mau). */
export function deltaTone(key: MeasureKey, delta: number): Tone {
  const def = MEASURE_BY_KEY[key];
  if (def.unit === "cm" && Math.abs(delta) < EQUAL_THRESHOLD_CM) return "same";
  if (def.good === "neutral" || delta === 0) return "neutral";
  const better = def.good === "down" ? delta < 0 : delta > 0;
  return better ? "good" : "bad";
}

/**
 * Último valor conhecido de cada medida (o registo mais recente que a tem),
 * ignorando opcionalmente um registo (o que está a ser editado).
 */
export function lastKnownValues(
  rows: ReadonlyArray<MeasurementLike & { id?: number }>,
  opts: { excludeId?: number; beforeDate?: string } = {},
): Partial<Record<MeasureKey, { value: number; date: string }>> {
  const sorted = [...rows]
    .filter((r) => r.id === undefined || r.id !== opts.excludeId)
    .filter((r) => !opts.beforeDate || r.date < opts.beforeDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const out: Partial<Record<MeasureKey, { value: number; date: string }>> = {};
  for (const row of sorted) {
    for (const key of Object.keys(MEASURE_BY_KEY) as MeasureKey[]) {
      const v = row[key];
      if (out[key] === undefined && typeof v === "number") out[key] = { value: v, date: row.date };
    }
  }
  return out;
}

/** Média das pesagens diárias nos 7 dias que terminam em `today` (inclusive). */
export function weeklyAverage(
  weights: ReadonlyArray<DailyWeightLike>,
  today: string,
): { average: number; count: number } | null {
  const start = shiftISODate(today, -6);
  const inWindow = weights.filter((w) => w.date >= start && w.date <= today);
  if (inWindow.length === 0) return null;
  const sum = inWindow.reduce((s, w) => s + w.weightKg, 0);
  return { average: Math.round((sum / inWindow.length) * 100) / 100, count: inWindow.length };
}

export type RecordHit = { kind: "waist" | "arm"; value: number; previous: number };

function maxArm(row: MeasurementLike | null | undefined): number | null {
  if (!row) return null;
  const arms = [row.armRightCm, row.armLeftCm].filter((v): v is number => typeof v === "number");
  return arms.length ? Math.max(...arms) : null;
}

/**
 * Recordes depois de gravar `saved`: menor cintura de sempre, maior braço de sempre
 * (o maior dos dois braços). Só conta se já houver histórico para comparar e se o
 * valor melhorou nesta gravação (`before` = o mesmo registo antes de editar/juntar),
 * para não repetir um recorde que já existia.
 */
export function detectRecords(
  saved: MeasurementLike,
  others: ReadonlyArray<MeasurementLike>,
  before?: MeasurementLike | null,
): RecordHit[] {
  const hits: RecordHit[] = [];

  const waists = others.map((r) => r.waistCm).filter((v): v is number => typeof v === "number");
  if (typeof saved.waistCm === "number" && waists.length > 0) {
    const best = Math.min(...waists);
    const improved = typeof before?.waistCm !== "number" || saved.waistCm < before.waistCm;
    if (saved.waistCm < best && improved) {
      hits.push({ kind: "waist", value: saved.waistCm, previous: best });
    }
  }

  const arms = others
    .flatMap((r) => [r.armRightCm, r.armLeftCm])
    .filter((v): v is number => typeof v === "number");
  const savedArm = maxArm(saved);
  if (savedArm !== null && arms.length > 0) {
    const best = Math.max(...arms);
    const prevArm = maxArm(before);
    const improved = prevArm === null || savedArm > prevArm;
    if (savedArm > best && improved) hits.push({ kind: "arm", value: savedArm, previous: best });
  }

  return hits;
}

/** Soma dias a uma data ISO "yyyy-MM-dd" (sem fuso: aritmética em UTC). */
export function shiftISODate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
