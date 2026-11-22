/**
 * Assistente de check-in: lógica pura e testável, sobre as médias de 7 dias
 * (lib/metrics.ts). É a CINTURA que decide; o braço também sobe com gordura e água.
 *
 * Só sugere CORTAR calorias se:
 *  A) a média de 7 dias da cintura subiu ≥ 0,5 cm face à semana anterior E a média
 *     de 7 dias do peso subiu ≥ 0,2 kg (com ≥ 5 pesagens em cada semana)
 *     → −150 kcal em hidratos (−38 g);
 *  B) a cintura subiu em 2 check-ins seguidos: três médias de 7 dias consecutivas
 *     (0–7, 7–14, 14–21 dias atrás), cada uma ≥ 0,3 cm acima da anterior; a atual
 *     com ≥ 4 medições, as antigas com ≥ 4 medições ou o valor único da semana
 *     (dados antigos) → −125 kcal em hidratos (−31 g).
 * Nunca corta numa semana marcada como atípica. A gordura nunca fica abaixo de 50 g.
 *
 * Outras situações:
 *  - poucos dados / só medições únicas → manter e recolher mais dados;
 *  - cintura a descer, braço (4 semanas) e força a cair → subir 125 kcal (hidratos);
 *  - cintura e braço iguais há ≥ 6 semanas → aviso "estagnação, reavalia o plano";
 *  - cintura a descer, braço não a cair → perfeito;
 *  - cintura igual, braço a subir → recomposição a funcionar;
 *  - resto → manter.
 */
import { formatDayMonth } from "./format";
import {
  AVERAGE_EQUAL_CM,
  SINGLE_EQUAL_CM,
  compareWindows,
  comparePoints,
  daysBetween,
  seriesOf,
  armAverage,
  shiftISODate,
  slowSummary,
  windowStat,
  type Comparison,
  type Point,
  type WindowStat,
} from "./metrics";

export const CHECKIN_INTERVAL_DAYS = 21;
export const CUT_A = { kcal: -150, carbsG: -38, fatG: 0 } as const;
export const CUT_B = { kcal: -125, carbsG: -31, fatG: 0 } as const;
export const RAISE = { kcal: 125, carbsG: 31, fatG: 0 } as const;
export const WAIST_UP_CUT_CM = 0.5;
export const WEIGHT_UP_KG = 0.2;
export const MIN_WEIGHINGS = 5;
export const STEP_UP_CM = 0.3;
export const MIN_FAT_G = 50;
export const STAGNATION_DAYS = 42;

export type CheckInRow = {
  date: string;
  waistCm?: number | null;
  armRightCm?: number | null;
  armLeftCm?: number | null;
  strengthDropping?: boolean | null;
};

export type RecommendationKind =
  | "collect" // manter e recolher mais dados
  | "cut-a"
  | "cut-b"
  | "atypical" // cortaria, mas a semana foi atípica
  | "raise"
  | "stagnation"
  | "perfect"
  | "working"
  | "watch"; // manter

export type Adjustment = { kcal: number; carbsG: number; fatG: number };

export type Recommendation = {
  kind: RecommendationKind;
  title: string;
  /** O porquê, em 1–2 frases. */
  message: string;
  adjustment: Adjustment | null;
  /** Cintura: semana atual vs semana anterior. */
  waist: Comparison | null;
  /** Peso: semana atual vs semana anterior (nas mesmas datas). */
  weight: Comparison | null;
  /** Braço: conclusão a 4 semanas. */
  arm: { delta: number; trend: "up" | "same" | "down"; from: string; to: string } | null;
  strengthDropping: boolean;
  atypical: boolean;
  due: boolean;
  daysUntilDue: number;
};

export type CheckInInput = {
  measurements: ReadonlyArray<CheckInRow>;
  /** Série do peso (pesagens diárias + recurso às medições antigas). */
  weights: ReadonlyArray<Point>;
  lastGoalDate: string | null;
  today: string;
  /** A semana atual está marcada como atípica? */
  atypicalWeek?: boolean;
};

function fmt(n: number): string {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(n);
}

/** Janela que conta para comparar: média fiável ou o valor único de uma semana antiga. */
function usable(w: WindowStat | null): boolean {
  return w !== null && (w.reliability === "fiavel" || w.reliability === "medicao-unica");
}

export function recommend(input: CheckInInput): Recommendation {
  const { measurements, weights, lastGoalDate, today, atypicalWeek = false } = input;
  const sinceGoal = lastGoalDate ? daysBetween(lastGoalDate, today) : CHECKIN_INTERVAL_DAYS;
  const due = sinceGoal >= CHECKIN_INTERVAL_DAYS;
  const daysUntilDue = Math.max(0, CHECKIN_INTERVAL_DAYS - sinceGoal);

  const waistPts = seriesOf(measurements, (r) => r.waistCm).filter((p) => p.date <= today);
  const armPts = seriesOf(measurements, armAverage).filter((p) => p.date <= today);

  const base = { due, daysUntilDue, atypical: atypicalWeek };
  const collect = (message: string, extra: Partial<Recommendation> = {}): Recommendation => ({
    ...base,
    kind: "collect",
    title: "Manter e recolher mais dados",
    message,
    adjustment: null,
    waist: null,
    weight: null,
    arm: null,
    strengthDropping: false,
    ...extra,
  });

  const last = waistPts.at(-1);
  if (!last) {
    return collect("Ainda não há medições de cintura. Mede todos os dias de manhã: com 4 medições numa semana a média fica fiável.");
  }

  const L = last.date;
  const W0 = windowStat(waistPts, L)!;
  const W1 = windowStat(waistPts, shiftISODate(L, -7));
  const W2 = windowStat(waistPts, shiftISODate(L, -14));
  const V0 = windowStat(weights, L);
  const V1 = windowStat(weights, shiftISODate(L, -7));
  const armSlow = slowSummary(armPts, today);
  const arm = armSlow?.fourWeeks
    ? { delta: armSlow.fourWeeks.delta, trend: armSlow.fourWeeks.trend, from: armSlow.fourWeeks.base.date, to: armSlow.latest.date }
    : null;
  const strengthDropping = measurements.some(
    (r) => r.date >= W0.from && r.date <= L && r.strengthDropping === true,
  );
  const weight = V0 && V1 ? compareWindows(V0, V1, "kg") : null;
  const common = { ...base, arm, strengthDropping, weight };

  // A semana atual tem de ter uma média fiável para o assistente agir.
  if (W0.reliability !== "fiavel") {
    return collect(
      W0.reliability === "medicao-unica"
        ? `A cintura desta semana é uma medição única (${formatDayMonth(W0.lastDate)}). Mede todos os dias: com pelo menos 4 medições em 7 dias a média fica fiável.`
        : `Só há ${W0.count} medições de cintura nos últimos 7 dias; são precisas pelo menos 4 para a média ser fiável.`,
      common,
    );
  }
  if (!W1 || !usable(W1)) {
    return collect(
      W1
        ? `A semana anterior só tem ${W1.count} medições de cintura, por isso ainda não dá para comparar com confiança.`
        : "Ainda não há uma semana anterior com medições de cintura para comparar.",
      common,
    );
  }

  const waist = compareWindows(W0, W1);
  const withWaist = { ...common, waist };

  // A) cintura +0,5 cm (média) e peso +0,2 kg (≥ 5 pesagens em cada semana)
  const weightUp =
    V0 !== null && V1 !== null && V0.count >= MIN_WEIGHINGS && V1.count >= MIN_WEIGHINGS && V0.value - V1.value >= WEIGHT_UP_KG - 1e-9;
  const condA = waist.exact >= WAIST_UP_CUT_CM - 1e-9 && weightUp;

  // B) três médias de 7 dias seguidas, cada uma ≥ 0,3 cm acima da anterior
  const condB =
    W2 !== null &&
    usable(W2) &&
    W1.value - W2.value >= STEP_UP_CM - 1e-9 &&
    W0.value - W1.value >= STEP_UP_CM - 1e-9;

  if (condA || condB) {
    const which = condA ? "A" : "B";
    const reason =
      which === "A"
        ? `A média da cintura subiu ${fmt(waist.delta)} cm e a do peso ${fmt(weight!.delta)} kg numa semana.`
        : `A cintura subiu duas semanas seguidas (${fmt(W2!.value)} → ${fmt(W1.value)} → ${fmt(W0.value)} cm).`;
    if (atypicalWeek) {
      return {
        ...withWaist,
        kind: "atypical",
        title: "Semana atípica: sem cortes",
        message: `${reason} Como marcaste esta semana como atípica, não sugiro cortes; volta a avaliar na próxima.`,
        adjustment: null,
      };
    }
    const adj = condA ? CUT_A : CUT_B;
    return {
      ...withWaist,
      kind: condA ? "cut-a" : "cut-b",
      title: `Retirar ${Math.abs(adj.kcal)} kcal aos hidratos`,
      message: `${reason} Tira ${Math.abs(adj.carbsG)} g de hidratos por dia e mantém a proteína e a gordura.`,
      adjustment: { ...adj },
    };
  }

  // Cintura a descer, braço e força a cair → comer mais
  if (waist.trend === "down" && arm?.trend === "down" && strengthDropping) {
    return {
      ...withWaist,
      kind: "raise",
      title: "Subir 125 kcal",
      message: `A cintura desceu, mas o braço caiu ${fmt(Math.abs(arm.delta))} cm em 4 semanas e a força está a cair: estás a perder músculo. Acrescenta ${RAISE.carbsG} g de hidratos por dia.`,
      adjustment: { ...RAISE },
    };
  }

  // Estagnação: cintura e braço iguais há ≥ 6 semanas
  const wOld = windowStat(waistPts, shiftISODate(L, -STAGNATION_DAYS));
  const armLatest = armPts.at(-1);
  const armOld = armLatest
    ? armPts.find((p) => Math.abs(daysBetween(shiftISODate(armLatest.date, -STAGNATION_DAYS), p.date)) <= 7) ?? null
    : null;
  if (wOld && usable(wOld) && armLatest && armOld) {
    const wStag = compareWindows(W0, wOld);
    const aStag = comparePoints(armLatest, armOld);
    if (wStag.trend === "same" && aStag.trend === "same") {
      return {
        ...withWaist,
        kind: "stagnation",
        title: "Estagnação: reavalia o plano",
        message: `A cintura e o braço estão iguais há ${daysBetween(wOld.lastDate, L)} dias. Não sugiro um corte automático: revê o treino, o sono e se estás mesmo a cumprir as metas.`,
        adjustment: null,
      };
    }
  }

  if (waist.trend === "down" && arm?.trend !== "down") {
    return {
      ...withWaist,
      kind: "perfect",
      title: "Perfeito: não mexas em nada",
      message: arm
        ? `A média da cintura desceu ${fmt(Math.abs(waist.delta))} cm e o braço ${arm.trend === "up" ? "subiu" : "manteve-se"} em 4 semanas.`
        : `A média da cintura desceu ${fmt(Math.abs(waist.delta))} cm. Continua a medir o braço todas as semanas para confirmar que o músculo se mantém.`,
      adjustment: null,
    };
  }

  if (waist.trend === "same" && arm?.trend === "up") {
    return {
      ...withWaist,
      kind: "working",
      title: "Recomposição a funcionar: não mexas",
      message: `A cintura está estável e o braço subiu ${fmt(arm.delta)} cm em 4 semanas.`,
      adjustment: null,
    };
  }

  const thr = waist.threshold === AVERAGE_EQUAL_CM ? AVERAGE_EQUAL_CM : SINGLE_EQUAL_CM;
  return {
    ...withWaist,
    kind: "watch",
    title: "Manter",
    message:
      waist.trend === "up"
        ? `A cintura subiu ${fmt(waist.delta)} cm, mas ${weightUp ? "ainda abaixo de 0,5 cm" : "o peso não subiu o suficiente"}: pode ser água ou digestão. Mantém e volta a ver na próxima semana.`
        : waist.trend === "same"
          ? `A média da cintura está igual (variação abaixo de ${fmt(thr)} cm). Mantém as metas e continua a medir.`
          : "A cintura desceu, mas o braço está a cair: confirma as medições do braço (contraído, no mesmo sítio) antes de mexer nas calorias.",
    adjustment: null,
  };
}

export type GoalValues = { calories: number; proteinG: number; carbsG: number; fatG: number };

/** Novas metas depois de aplicar o ajuste. Hidratos ≥ 0; gordura nunca abaixo de 50 g. */
export function applyAdjustment(goal: GoalValues, adj: Adjustment): GoalValues {
  const fatG = adj.fatG < 0 ? Math.max(MIN_FAT_G, goal.fatG + adj.fatG) : goal.fatG + adj.fatG;
  return {
    calories: Math.max(0, goal.calories + adj.kcal),
    proteinG: goal.proteinG,
    carbsG: Math.max(0, goal.carbsG + adj.carbsG),
    fatG,
  };
}
