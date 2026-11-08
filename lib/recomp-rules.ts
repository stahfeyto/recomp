/**
 * Assistente de check-in (secção 7.6): lógica pura e testável.
 *
 * Compara a cintura (e o braço) da última semana de medições com a de há ~3 semanas,
 * ou desde o último ajuste de metas se for mais recente. É a CINTURA que decide: o
 * braço também sobe com gordura e água, e músculo natural no braço cresce no máximo
 * ~0,5 cm/mês.
 *
 * | Situação                                         | Recomendação                     |
 * |--------------------------------------------------|----------------------------------|
 * | Cintura a descer, braço igual ou a subir         | Perfeito: não mexer              |
 * | Cintura igual, braço a subir                     | Recomposição a funcionar         |
 * | Cintura igual, braço igual                       | Retirar 100–150 kcal (hidratos)  |
 * | Cintura a subir ≥ 0,5 cm (braço indiferente)     | Retirar 150 kcal à gordura       |
 * | Cintura a descer, mas braço E força a cair       | Subir 100–150 kcal (hidratos)    |
 * | Qualquer outro caso                              | Manter e vigiar                  |
 *
 * "Igual" = variação inferior a ±0,3 cm (erro de medição).
 */
import {
  CHECKIN_INTERVAL_DAYS,
  armAverage,
  daysBetween,
  round1,
  shiftISODate,
  type MeasurementLike,
} from "./calculations";
import { EQUAL_THRESHOLD_CM } from "./measures";

/** Cintura a subir a partir disto: cortar à gordura. */
export const WAIST_UP_CUT_CM = 0.5;
/** Ajuste "100–150 kcal": usamos o meio, em hidratos (4 kcal/g). */
export const CARB_STEP_KCAL = 125;
/** Ajuste da cintura a subir: 150 kcal, tirados à gordura (9 kcal/g). */
export const FAT_CUT_KCAL = 150;
/** Mínimo de dias entre as duas janelas para a comparação valer alguma coisa. */
export const MIN_SPAN_DAYS = 14;

export type Trend = "down" | "same" | "up";

export type CheckInRow = MeasurementLike & { strengthDropping?: boolean | null };

export type RecommendationKind =
  | "insufficient" // dados insuficientes
  | "measure-arms" // falta o braço para decidir
  | "perfect" // cintura a descer, braço igual/subir
  | "working" // cintura igual, braço a subir
  | "cut" // cintura igual, braço igual
  | "cut-fat" // cintura a subir ≥ 0,5
  | "raise" // cintura a descer, braço e força a cair
  | "watch"; // caso não coberto

export type Adjustment = {
  /** Variação das calorias (kcal). */
  kcal: number;
  /** Variação dos macros (g). */
  carbsG: number;
  fatG: number;
};

export type Comparison = {
  from: string;
  to: string;
  before: number;
  after: number;
  /** Variação arredondada a 0,1 (para mostrar). */
  delta: number;
  /** Variação exata (para decidir). */
  exact: number;
  trend: Trend;
};

export type Recommendation = {
  kind: RecommendationKind;
  title: string;
  message: string;
  adjustment: Adjustment | null;
  waist: Comparison | null;
  arm: Comparison | null;
  strengthDropping: boolean;
  /** Já passaram 21 dias desde o último ajuste? Só então se aplica. */
  due: boolean;
  daysUntilDue: number;
};

/** Classifica uma variação: |Δ| < 0,3 cm conta como igual. */
export function trend(delta: number, threshold = EQUAL_THRESHOLD_CM): Trend {
  if (delta <= -threshold) return "down";
  if (delta >= threshold) return "up";
  return "same";
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

/** Média dos valores de `pick` nos registos com data em [from, to]. */
function windowAverage(
  rows: ReadonlyArray<CheckInRow>,
  pick: (r: CheckInRow) => number | null | undefined,
  from: string,
  to: string,
): { value: number; first: string; last: string } | null {
  const inWin = rows
    .filter((r) => r.date >= from && r.date <= to)
    .map((r) => ({ date: r.date, v: pick(r) }))
    .filter((x): x is { date: string; v: number } => typeof x.v === "number")
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const avg = average(inWin.map((x) => x.v));
  return avg === null ? null : { value: avg, first: inWin[0].date, last: inWin[inWin.length - 1].date };
}

function compare(
  before: { value: number; first: string },
  after: { value: number; last: string },
): Comparison {
  // A classificação usa o valor exato (−0,29 é "igual"); o arredondamento é só para mostrar.
  const raw = after.value - before.value;
  return {
    from: before.first,
    to: after.last,
    before: round1(before.value),
    after: round1(after.value),
    delta: round1(raw),
    exact: Math.round(raw * 1000) / 1000,
    trend: trend(Math.round(raw * 1000) / 1000),
  };
}

/**
 * Calcula a recomendação.
 * @param rows registos semanais (qualquer ordem)
 * @param lastGoalDate data (ISO) do último ajuste de metas em vigor
 * @param today data (ISO) de hoje
 */
export function recommend(
  rows: ReadonlyArray<CheckInRow>,
  lastGoalDate: string | null,
  today: string,
): Recommendation {
  const sinceGoal = lastGoalDate ? daysBetween(lastGoalDate, today) : CHECKIN_INTERVAL_DAYS;
  const due = sinceGoal >= CHECKIN_INTERVAL_DAYS;
  const daysUntilDue = Math.max(0, CHECKIN_INTERVAL_DAYS - sinceGoal);

  const base = {
    adjustment: null,
    waist: null,
    arm: null,
    strengthDropping: false,
    due,
    daysUntilDue,
  } satisfies Partial<Recommendation>;

  // Última medição de cintura (não conta o futuro).
  const waistDates = rows
    .filter((r) => typeof r.waistCm === "number" && r.date <= today)
    .map((r) => r.date)
    .sort();
  const latest = waistDates.at(-1);
  if (!latest) {
    return { ...base, kind: "insufficient", title: "Ainda sem medições de cintura", message: "Mede a cintura uma vez por semana para o assistente poder comparar." };
  }

  // Janela "antes": começa há 21 dias, ou no último ajuste se for mais recente.
  const anchorCandidates = [shiftISODate(latest, -CHECKIN_INTERVAL_DAYS)];
  if (lastGoalDate) anchorCandidates.push(lastGoalDate);
  const anchor = anchorCandidates.sort().at(-1)!;
  const span = daysBetween(anchor, latest);
  if (span < MIN_SPAN_DAYS) {
    return {
      ...base,
      kind: "insufficient",
      title: "Ainda é cedo para comparar",
      message: `São precisas pelo menos ${MIN_SPAN_DAYS} dias de medições depois do último ajuste. Continua a medir a cintura todas as semanas.`,
    };
  }

  const waistBefore = windowAverage(rows, (r) => r.waistCm, anchor, shiftISODate(anchor, 6));
  const waistAfter = windowAverage(rows, (r) => r.waistCm, shiftISODate(latest, -6), latest);
  if (!waistBefore || !waistAfter || waistBefore.last >= waistAfter.first) {
    return {
      ...base,
      kind: "insufficient",
      title: "Faltam medições para comparar",
      message: "É preciso uma medição de cintura no início do período e outra na última semana.",
    };
  }
  const waist = compare(waistBefore, waistAfter);

  // Braço: medido a cada 2 semanas, por isso janelas de 14 dias.
  const armBefore = windowAverage(rows, armAverage, anchor, shiftISODate(anchor, 13));
  const armAfter = windowAverage(rows, armAverage, shiftISODate(latest, -13), latest);
  const arm =
    armBefore && armAfter && armBefore.last < armAfter.first ? compare(armBefore, armAfter) : null;

  const strengthDropping = rows.some(
    (r) => r.date >= shiftISODate(latest, -6) && r.date <= latest && r.strengthDropping === true,
  );

  const common = { due, daysUntilDue, waist, arm, strengthDropping };

  // 1. Cintura a subir ≥ 0,5 cm: corta à gordura, o braço não interessa.
  if (waist.exact >= WAIST_UP_CUT_CM) {
    const fatG = -Math.round(FAT_CUT_KCAL / 9);
    return {
      ...common,
      kind: "cut-fat",
      title: "Retirar 150 kcal, tirando à gordura",
      message: `A cintura subiu ${fmt(waist.delta)} cm. Corta ${Math.abs(fatG)} g de gordura (≈150 kcal) e mantém a proteína.`,
      adjustment: { kcal: -FAT_CUT_KCAL, carbsG: 0, fatG },
    };
  }

  if (waist.trend === "down") {
    // 2. Cintura a descer, mas braço e força a cair: comer mais.
    if (arm?.trend === "down" && strengthDropping) {
      const carbsG = Math.round(CARB_STEP_KCAL / 4);
      return {
        ...common,
        kind: "raise",
        title: "Subir 100–150 kcal",
        message: `A cintura desceu, mas o braço (${fmt(arm.delta)} cm) e a força estão a cair: estás a perder músculo. Acrescenta ${carbsG} g de hidratos (≈${CARB_STEP_KCAL} kcal).`,
        adjustment: { kcal: CARB_STEP_KCAL, carbsG, fatG: 0 },
      };
    }
    // 3. Cintura a descer, braço igual ou a subir: perfeito.
    if (!arm || arm.trend !== "down") {
      return {
        ...common,
        kind: "perfect",
        title: "Perfeito: não mexas em nada",
        message: arm
          ? `A cintura desceu ${fmt(Math.abs(waist.delta))} cm e o braço ${arm.trend === "up" ? "subiu" : "manteve-se"}. Continua assim.`
          : `A cintura desceu ${fmt(Math.abs(waist.delta))} cm. Mede os braços para confirmar que o músculo se mantém.`,
        adjustment: null,
      };
    }
    // Cintura a descer, braço a cair, força estável: não coberto.
    return {
      ...common,
      kind: "watch",
      title: "Manter e vigiar",
      message: `A cintura desceu, mas o braço caiu ${fmt(Math.abs(arm.delta))} cm. Como a força não está a cair, pode ser água ou erro de medição. Mantém as metas e confirma no próximo check-in.`,
      adjustment: null,
    };
  }

  if (waist.trend === "same") {
    if (!arm) {
      return {
        ...common,
        kind: "measure-arms",
        title: "Mede os braços para decidir",
        message: "A cintura está igual. Sem a medida dos braços não dá para saber se a recomposição está a funcionar.",
        adjustment: null,
      };
    }
    // 4. Cintura igual, braço a subir.
    if (arm.trend === "up") {
      return {
        ...common,
        kind: "working",
        title: "Recomposição a funcionar: não mexas",
        message: `A cintura está estável e o braço subiu ${fmt(arm.delta)} cm.`,
        adjustment: null,
      };
    }
    // 5. Cintura igual, braço igual.
    if (arm.trend === "same") {
      const carbsG = -Math.round(CARB_STEP_KCAL / 4);
      return {
        ...common,
        kind: "cut",
        title: "Retirar 100–150 kcal",
        message: `Cintura e braço estáveis há ${daysBetween(waist.from, waist.to)} dias. Tira ${Math.abs(carbsG)} g de hidratos (≈${CARB_STEP_KCAL} kcal) para voltar a mexer a cintura.`,
        adjustment: { kcal: -CARB_STEP_KCAL, carbsG, fatG: 0 },
      };
    }
    // Cintura igual, braço a cair: não coberto.
    return {
      ...common,
      kind: "watch",
      title: "Manter e vigiar",
      message: `A cintura está igual e o braço caiu ${fmt(Math.abs(arm.delta))} cm. Confirma as medições (contraído, mesmo sítio) antes de mexer nas calorias.`,
      adjustment: null,
    };
  }

  // Cintura a subir entre 0,3 e 0,5 cm: ainda abaixo do limite de corte.
  return {
    ...common,
    kind: "watch",
    title: "Manter e vigiar",
    message: `A cintura subiu ${fmt(waist.delta)} cm, abaixo do limite de ${fmt(WAIST_UP_CUT_CM)} cm para cortar. Revê no próximo check-in.`,
    adjustment: null,
  };
}

function fmt(n: number): string {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(n);
}

export type GoalValues = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/** Novas metas depois de aplicar o ajuste (nunca abaixo de zero). */
export function applyAdjustment(goal: GoalValues, adj: Adjustment): GoalValues {
  return {
    calories: Math.max(0, goal.calories + adj.kcal),
    proteinG: goal.proteinG,
    carbsG: Math.max(0, goal.carbsG + adj.carbsG),
    fatG: Math.max(0, goal.fatG + adj.fatG),
  };
}
