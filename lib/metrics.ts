/**
 * Módulo ÚNICO de cálculo das medições. Painel, Medidas, Evolução, Antes/Agora e o
 * assistente de check-in usam só estas funções, para os números baterem certo em
 * todas as páginas. Funções puras (sem BD, sem relógio): testadas em tests/metrics.test.ts.
 *
 * Regras:
 * - Média de 7 dias de uma série diária: "fiável" com ≥ 4 medições na janela,
 *   "poucos dados" com 2–3, "medição única" com 1 (ex.: semanas antigas com uma
 *   cintura por semana: esse valor é o valor da semana).
 * - Erro de medição: valores isolados (ou médias pouco fiáveis) < 0,5 cm = "igual";
 *   médias de 7 dias fiáveis < 0,3 cm = "igual". Peso: < 0,2 kg = "igual".
 * - Braço, peito e ombros (semanais): variação face ao último registo, mas a
 *   conclusão (a subir / igual / a descer) é sobre ~4 semanas.
 * - Peso por data: média de 7 dias das pesagens diárias; o peso das medições
 *   semanais só serve de recurso nos dias sem pesagem.
 */
import type { MeasureKey } from "./measures";

/* ------------------------------------------------------------------ tipos */

export type Point = { date: string; value: number };
export type Trend = "up" | "same" | "down";
export type Reliability = "fiavel" | "poucos-dados" | "medicao-unica";
export type Tone = "good" | "bad" | "same" | "neutral";

/** Estatística de uma janela de N dias. */
export type WindowStat = {
  /** Média dos valores na janela (arredondada a 2 casas). */
  value: number;
  count: number;
  reliability: Reliability;
  /** Janela pedida [from, to]. */
  from: string;
  to: string;
  /** Primeira e última data com valor dentro da janela. */
  firstDate: string;
  lastDate: string;
};

export type Comparison = {
  current: WindowStat;
  base: WindowStat;
  /** Variação arredondada a 0,1 (para mostrar). */
  delta: number;
  /** Variação exata (para decidir). */
  exact: number;
  /** Limiar usado para "igual". */
  threshold: number;
  trend: Trend;
};

/* ------------------------------------------------------------- constantes */

export const WINDOW_DAYS = 7;
/** Medições mínimas numa janela de 7 dias para a média ser fiável. */
export const MIN_RELIABLE = 4;
/** Valor isolado (ou média pouco fiável): abaixo disto é "igual". */
export const SINGLE_EQUAL_CM = 0.5;
/** Média de 7 dias fiável: abaixo disto é "igual". */
export const AVERAGE_EQUAL_CM = 0.3;
/** Peso: abaixo disto é "igual". */
export const WEIGHT_EQUAL_KG = 0.2;
/** Janela de conclusão das medidas semanais (braço, peito, ombros). */
export const SLOW_TREND_DAYS = 28;

/* ------------------------------------------------------------------ datas */

export function shiftISODate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

/** Segunda-feira da semana de uma data ISO. */
export function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7; // segunda = 0
  return shiftISODate(iso, -offset);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ---------------------------------------------------------------- séries */

type Row = { date: string } & Partial<Record<MeasureKey, number | null>>;

/** Série de uma medida a partir dos registos (um ponto por dia com valor), por ordem de data. */
export function seriesOf(rows: ReadonlyArray<Row>, pick: (r: Row) => number | null | undefined): Point[] {
  return rows
    .map((r) => ({ date: r.date, value: pick(r) }))
    .filter((p): p is Point => typeof p.value === "number" && Number.isFinite(p.value))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Média dos dois braços (só quando o registo tem os dois). */
export function armAverage(r: Row): number | null {
  return typeof r.armRightCm === "number" && typeof r.armLeftCm === "number"
    ? round2((r.armRightCm + r.armLeftCm) / 2)
    : null;
}

/**
 * Série do peso: as pesagens diárias e, nos dias sem pesagem, o peso das medições
 * semanais antigas (recurso). Nunca duplica um dia.
 */
export function weightSeries(
  dailyWeights: ReadonlyArray<{ date: string; weightKg: number }>,
  measurements: ReadonlyArray<Row>,
): Point[] {
  const byDate = new Map<string, number>();
  for (const m of measurements) if (typeof m.weightKg === "number") byDate.set(m.date, m.weightKg);
  for (const w of dailyWeights) byDate.set(w.date, w.weightKg); // a pesagem diária tem prioridade
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/* -------------------------------------------------------------- janelas */

export function reliabilityOf(count: number): Reliability {
  if (count >= MIN_RELIABLE) return "fiavel";
  if (count >= 2) return "poucos-dados";
  return "medicao-unica";
}

/** Estatística da janela de `days` dias que termina em `endDate` (inclusive). */
export function windowStat(points: ReadonlyArray<Point>, endDate: string, days = WINDOW_DAYS): WindowStat | null {
  const from = shiftISODate(endDate, -(days - 1));
  const inWin = points.filter((p) => p.date >= from && p.date <= endDate);
  if (inWin.length === 0) return null;
  const sum = inWin.reduce((s, p) => s + p.value, 0);
  return {
    value: round2(sum / inWin.length),
    count: inWin.length,
    reliability: reliabilityOf(inWin.length),
    from,
    to: endDate,
    firstDate: inWin[0].date,
    lastDate: inWin[inWin.length - 1].date,
  };
}

/** Semana atual: janela de 7 dias que termina no último ponto (até `today`). */
export function currentWindow(points: ReadonlyArray<Point>, today: string): WindowStat | null {
  const last = [...points].reverse().find((p) => p.date <= today);
  return last ? windowStat(points, last.date) : null;
}

/**
 * Semana anterior: a janela de 7 dias que termina no último ponto ANTES da janela
 * `current` (com dados diários é a semana imediatamente antes; com dados antigos
 * semanais é a medição da semana anterior).
 */
export function previousWindow(points: ReadonlyArray<Point>, current: WindowStat): WindowStat | null {
  const before = [...points].reverse().find((p) => p.date < current.from);
  return before ? windowStat(points, before.date) : null;
}

/** Primeira semana com dados: [primeiro ponto, +6 dias]. */
export function firstWindow(points: ReadonlyArray<Point>): WindowStat | null {
  if (points.length === 0) return null;
  return windowStat(points, shiftISODate(points[0].date, WINDOW_DAYS - 1));
}

/* -------------------------------------------------------------- comparar */

/** Limiar de "igual" para duas janelas de uma medida em cm. */
export function equalThresholdCm(a: WindowStat, b: WindowStat): number {
  return a.reliability === "fiavel" && b.reliability === "fiavel" ? AVERAGE_EQUAL_CM : SINGLE_EQUAL_CM;
}

export function trendOf(exact: number, threshold: number): Trend {
  if (Math.abs(exact) < threshold - 1e-9) return "same";
  return exact > 0 ? "up" : "down";
}

/** Compara duas janelas (cm por defeito; `unit: "kg"` usa o limiar do peso). */
export function compareWindows(current: WindowStat, base: WindowStat, unit: "cm" | "kg" = "cm"): Comparison {
  const exact = Math.round((current.value - base.value) * 1000) / 1000;
  const threshold = unit === "kg" ? WEIGHT_EQUAL_KG : equalThresholdCm(current, base);
  return { current, base, delta: round1(exact), exact, threshold, trend: trendOf(exact, threshold) };
}

/** Compara dois valores isolados (registos semanais): limiar de 0,5 cm. */
export function comparePoints(current: Point, base: Point): { delta: number; exact: number; trend: Trend } {
  const exact = Math.round((current.value - base.value) * 1000) / 1000;
  return { delta: round1(exact), exact, trend: trendOf(exact, SINGLE_EQUAL_CM) };
}

/* ---------------------------------------------------- resumo de uma série */

export type AveragedSummary = {
  current: WindowStat;
  previous: Comparison | null;
  sinceStart: Comparison | null;
};

/**
 * Cintura ou peso: média de 7 dias atual, comparada com a semana anterior e com a
 * primeira semana. "Desde o início" só existe se a primeira semana não se cruzar
 * com a atual.
 */
export function averagedSummary(
  points: ReadonlyArray<Point>,
  today: string,
  unit: "cm" | "kg" = "cm",
): AveragedSummary | null {
  const current = currentWindow(points, today);
  if (!current) return null;
  const prev = previousWindow(points, current);
  const first = firstWindow(points);
  return {
    current,
    previous: prev ? compareWindows(current, prev, unit) : null,
    sinceStart: first && first.to < current.from ? compareWindows(current, first, unit) : null,
  };
}

export type SlowSummary = {
  latest: Point;
  /** Variação face ao registo anterior (só para mostrar). */
  vsLast: { previous: Point; delta: number; trend: Trend } | null;
  /** Conclusão sobre ~4 semanas (null se ainda não houver 4 semanas de dados). */
  fourWeeks: { base: Point; delta: number; trend: Trend; days: number } | null;
  /** Variação desde o primeiro registo. */
  sinceStart: { base: Point; delta: number; trend: Trend } | null;
};

/** O ponto mais próximo de `target` dentro de [target − tol, target + tol]. */
function closestPoint(points: ReadonlyArray<Point>, target: string, tol: number): Point | null {
  let best: Point | null = null;
  let bestDist = Infinity;
  for (const p of points) {
    const d = Math.abs(daysBetween(target, p.date));
    if (d <= tol && d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Braço, peito, ombros (medidas lentas, semanais): último valor, variação face ao
 * registo anterior e conclusão a 4 semanas (registo mais próximo de há 28 dias,
 * entre 21 e 35 dias antes).
 */
export function slowSummary(points: ReadonlyArray<Point>, today: string): SlowSummary | null {
  const upToToday = points.filter((p) => p.date <= today);
  const latest = upToToday.at(-1);
  if (!latest) return null;
  const previous = upToToday.length > 1 ? upToToday[upToToday.length - 2] : null;
  const base = closestPoint(
    upToToday.filter((p) => p.date < latest.date),
    shiftISODate(latest.date, -SLOW_TREND_DAYS),
    7,
  );
  const first = upToToday[0];
  return {
    latest,
    vsLast: previous ? { previous, ...comparePoints(latest, previous) } : null,
    fourWeeks: base ? { base, ...comparePoints(latest, base), days: daysBetween(base.date, latest.date) } : null,
    sinceStart: first.date < latest.date ? { base: first, ...comparePoints(latest, first) } : null,
  };
}

/* ------------------------------------------------------------- juízo */

/** Sentido "bom" de cada medida para a recomposição. */
const GOOD: Partial<Record<MeasureKey, "up" | "down">> = {
  waistCm: "down",
  armRightCm: "up",
  armLeftCm: "up",
  chestCm: "up",
  shouldersCm: "up",
  thighCm: "up",
  calfCm: "up",
};

/** Cor da variação: verde = bom para a recomposição, vermelho = mau, cinzento = igual/neutro. */
export function toneOf(key: MeasureKey, trend: Trend): Tone {
  if (trend === "same") return "same";
  const good = GOOD[key];
  if (!good) return "neutral";
  return trend === good ? "good" : "bad";
}

export const TREND_LABEL: Record<Trend, string> = {
  up: "a subir",
  same: "igual",
  down: "a descer",
};

export const RELIABILITY_LABEL: Record<Reliability, string> = {
  fiavel: "média de 7 dias",
  "poucos-dados": "poucos dados",
  "medicao-unica": "medição única",
};

/* ------------------------------------------------- valores numa data */

/** Peso numa data: média de 7 dias das pesagens (com recurso às medições antigas). */
export function weightAt(points: ReadonlyArray<Point>, date: string): WindowStat | null {
  return windowStat(points, date);
}

/** Último valor conhecido de uma série até uma data (inclusive). */
export function lastAt(points: ReadonlyArray<Point>, date: string): Point | null {
  return [...points].reverse().find((p) => p.date <= date) ?? null;
}

/* ------------------------------------------------- outros cálculos */

/** Média móvel de 7 dias em cada ponto (para as linhas dos gráficos). */
export function movingAverage(points: ReadonlyArray<Point>): Array<Point & { count: number }> {
  return points.map((p) => {
    const w = windowStat(points, p.date)!;
    return { date: p.date, value: w.value, count: w.count };
  });
}

export function ratio(a: number, b: number): number {
  return Math.round((a / b) * 100) / 100;
}
