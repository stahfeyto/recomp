/**
 * Cálculos que não são de medições (saudação, datas do check-in, lembretes,
 * recordes). Os cálculos das medições (médias, comparações, limiares) estão TODOS
 * em lib/metrics.ts; daqui só se reexportam os utilitários partilhados.
 */
import type { MeasureKey } from "./measures";
import { daysBetween, shiftISODate } from "./metrics";

export { daysBetween, ratio, round1, shiftISODate } from "./metrics";

export type MeasurementLike = { date: string } & Partial<Record<MeasureKey, number | null>>;

/**
 * Último valor conhecido de cada medida (o registo mais recente que a tem),
 * ignorando opcionalmente um registo (o que está a ser editado) ou o que vem depois
 * de uma data.
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
    for (const key of Object.keys(row) as MeasureKey[]) {
      const v = row[key];
      if (out[key] === undefined && typeof v === "number") out[key] = { value: v, date: row.date };
    }
  }
  return out;
}

export type RecordHit = { kind: "arm"; value: number; previous: number };

function maxArm(row: MeasurementLike | null | undefined): number | null {
  if (!row) return null;
  const arms = [row.armRightCm, row.armLeftCm].filter((v): v is number => typeof v === "number");
  return arms.length ? Math.max(...arms) : null;
}

/**
 * Recorde de braço depois de gravar `saved`: o maior dos dois braços acima de todos
 * os registos anteriores, e melhor do que o mesmo registo antes da edição. (A cintura
 * já não tem "recorde" por medição: com medições diárias seria ruído.)
 */
export function detectRecords(
  saved: MeasurementLike,
  others: ReadonlyArray<MeasurementLike>,
  before?: MeasurementLike | null,
): RecordHit[] {
  const arms = others
    .flatMap((r) => [r.armRightCm, r.armLeftCm])
    .filter((v): v is number => typeof v === "number");
  const savedArm = maxArm(saved);
  if (savedArm === null || arms.length === 0) return [];
  const best = Math.max(...arms);
  const prevArm = maxArm(before);
  const improved = prevArm === null || savedArm > prevArm;
  return savedArm > best && improved ? [{ kind: "arm", value: savedArm, previous: best }] : [];
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

/**
 * Lembrete do que medir: cintura todos os dias; braço, peito e ombros 1× por semana.
 */
export function dueMeasures(
  rows: ReadonlyArray<MeasurementLike>,
  today: string,
): { waistToday: boolean; weekly: boolean; daysSinceWeekly: number | null } {
  const waistToday = rows.some((r) => r.date === today && typeof r.waistCm === "number");
  const weeklyDates = rows
    .filter((r) => [r.armRightCm, r.armLeftCm, r.chestCm, r.shouldersCm].some((v) => typeof v === "number"))
    .map((r) => r.date)
    .filter((d) => d <= today)
    .sort();
  const last = weeklyDates.at(-1);
  const daysSinceWeekly = last ? daysBetween(last, today) : null;
  return { waistToday, weekly: daysSinceWeekly === null || daysSinceWeekly >= 7, daysSinceWeekly };
}

/** Data ISO de há `days` dias, ou null para "tudo". */
export function periodStart(today: string, days: number | null): string | null {
  return days === null ? null : shiftISODate(today, -days);
}

/** Converte uma data ISO em milissegundos (meia-noite UTC), para eixos de tempo. */
export function isoToTime(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getTime();
}
