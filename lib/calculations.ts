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

/* ------------------------------------------------------------------ painel */

export type Point = { value: number; date: string };

/** Valor atual, o anterior e o do início de uma medida (registos em qualquer ordem). */
export function seriesSummary(
  rows: ReadonlyArray<MeasurementLike>,
  pick: (r: MeasurementLike) => number | null | undefined,
): { current: Point; previous: Point | null; first: Point } | null {
  const pts = rows
    .map((r) => ({ value: pick(r), date: r.date }))
    .filter((p): p is Point => typeof p.value === "number")
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (pts.length === 0) return null;
  return {
    current: pts[pts.length - 1],
    previous: pts.length > 1 ? pts[pts.length - 2] : null,
    first: pts[0],
  };
}

/** Média dos dois braços (só quando o registo tem ambos). */
export function armAverage(r: MeasurementLike): number | null {
  return typeof r.armRightCm === "number" && typeof r.armLeftCm === "number"
    ? round1((r.armRightCm + r.armLeftCm) / 2)
    : null;
}

/** "Bom dia" (5–12h), "Boa tarde" (12–20h), "Boa noite". */
export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 20) return "Boa tarde";
  return "Boa noite";
}

/** Ideal estético da proporção ombros/cintura. */
export const SHOULDER_WAIST_IDEAL = 1.6;
/** Limite da zona saudável do rácio cintura/altura. */
export const WAIST_HEIGHT_HEALTHY = 0.5;

export function ratio(a: number, b: number): number {
  return Math.round((a / b) * 100) / 100;
}

/** Dias entre duas datas ISO (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

/** Intervalo entre check-ins depois de um ajuste de metas. */
export const CHECKIN_INTERVAL_DAYS = 21;

/** Próximo check-in: 21 dias depois do último ajuste de metas (effective_from mais recente ≤ hoje). */
export function nextCheckIn(
  goalDates: ReadonlyArray<string>,
  today: string,
): { date: string; daysLeft: number; since: string } | null {
  const past = goalDates.filter((d) => d <= today).sort();
  if (past.length === 0) return null;
  const since = past[past.length - 1];
  const date = shiftISODate(since, CHECKIN_INTERVAL_DAYS);
  return { date, daysLeft: daysBetween(today, date), since };
}

/** Lembrete do que medir esta semana: cintura 1×/semana, braços a cada 2 semanas. */
export function dueMeasures(
  rows: ReadonlyArray<MeasurementLike>,
  today: string,
): { waist: boolean; arms: boolean; daysSinceWaist: number | null; daysSinceArms: number | null } {
  const lastDate = (pick: (r: MeasurementLike) => unknown) => {
    const dates = rows.filter((r) => typeof pick(r) === "number").map((r) => r.date).sort();
    return dates.length ? dates[dates.length - 1] : null;
  };
  const w = lastDate((r) => r.waistCm);
  const a = lastDate((r) => r.armRightCm ?? r.armLeftCm);
  const daysSinceWaist = w ? daysBetween(w, today) : null;
  const daysSinceArms = a ? daysBetween(a, today) : null;
  return {
    waist: daysSinceWaist === null || daysSinceWaist >= 7,
    arms: daysSinceArms === null || daysSinceArms >= 14,
    daysSinceWaist,
    daysSinceArms,
  };
}

/** Média semanal das pesagens: a semana atual e a anterior (dias 7–13 atrás). */
export function weightWeeks(
  weights: ReadonlyArray<DailyWeightLike>,
  today: string,
): { current: { average: number; count: number } | null; previous: { average: number; count: number } | null } {
  return {
    current: weeklyAverage(weights, today),
    previous: weeklyAverage(weights, shiftISODate(today, -7)),
  };
}
