import { describe, expect, it } from "vitest";
import { CUT_A, CUT_B, RAISE, applyAdjustment, recommend, type CheckInRow } from "@/lib/recomp-rules";
import type { Point } from "@/lib/metrics";

const TODAY = "2026-12-20";
const GOAL = "2026-11-01"; // último ajuste há mais de 21 dias

/** Datas de `from` durante `n` dias. */
function days(from: string, n: number): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Cintura diária numa semana (7 dias a partir de `from`) com o valor `v`. */
const waistWeek = (from: string, v: number, n = 7): CheckInRow[] => days(from, n).map((date) => ({ date, waistCm: v }));
/** Pesagens diárias numa semana. */
const weightWeek = (from: string, v: number, n = 7): Point[] => days(from, n).map((date) => ({ date, value: v }));

// Três semanas seguidas que terminam a 20 dez: W2 = 30 nov–6 dez, W1 = 7–13 dez, W0 = 14–20 dez.
const W2 = "2026-11-30";
const W1 = "2026-12-07";
const W0 = "2026-12-14";

const base = (overrides: Partial<Parameters<typeof recommend>[0]> = {}) =>
  recommend({ measurements: [], weights: [], lastGoalDate: GOAL, today: TODAY, ...overrides });

describe("condição A: cintura +0,5 cm (média) e peso +0,2 kg", () => {
  it("corta 150 kcal aos hidratos (−38 g)", () => {
    const r = base({
      measurements: [...waistWeek(W1, 83), ...waistWeek(W0, 83.6)],
      weights: [...weightWeek(W1, 65), ...weightWeek(W0, 65.3)],
    });
    expect(r.kind).toBe("cut-a");
    expect(r.adjustment).toEqual({ ...CUT_A });
    expect(r.adjustment).toEqual({ kcal: -150, carbsG: -38, fatG: 0 });
    expect(r.message.length).toBeGreaterThan(20);
  });

  it("peso a subir menos de 0,2 kg → não corta", () => {
    const r = base({
      measurements: [...waistWeek(W1, 83), ...waistWeek(W0, 83.6)],
      weights: [...weightWeek(W1, 65), ...weightWeek(W0, 65.1)],
    });
    expect(r.adjustment).toBeNull();
    expect(r.kind).toBe("watch");
  });

  it("menos de 5 pesagens numa das semanas → não corta", () => {
    const r = base({
      measurements: [...waistWeek(W1, 83), ...waistWeek(W0, 83.6)],
      weights: [...weightWeek(W1, 65, 4), ...weightWeek(W0, 65.5)],
    });
    expect(r.adjustment).toBeNull();
  });
});

describe("condição B: cintura a subir em 2 check-ins seguidos (semanas de 7 dias)", () => {
  it("três médias seguidas, cada uma +0,3 cm → corta 125 kcal aos hidratos (−31 g)", () => {
    const r = base({ measurements: [...waistWeek(W2, 83), ...waistWeek(W1, 83.3), ...waistWeek(W0, 83.6)] });
    expect(r.kind).toBe("cut-b");
    expect(r.adjustment).toEqual({ ...CUT_B });
  });

  it("um dos passos abaixo de 0,3 cm → não corta", () => {
    const r = base({ measurements: [...waistWeek(W2, 83), ...waistWeek(W1, 83.2), ...waistWeek(W0, 83.5)] });
    expect(r.adjustment).toBeNull();
  });

  it("dados antigos: usa o valor único da semana nas semanas anteriores", () => {
    const r = base({
      measurements: [
        { date: "2026-12-06", waistCm: 83 }, // semana antiga, uma medição
        { date: "2026-12-13", waistCm: 83.3 }, // semana antiga, uma medição
        ...waistWeek(W0, 83.6),
      ],
    });
    expect(r.kind).toBe("cut-b");
  });

  it("semana anterior com 2–3 medições (poucos dados) não conta", () => {
    const r = base({
      measurements: [...waistWeek(W2, 83), ...waistWeek(W1, 83.3, 3), ...waistWeek(W0, 83.6)],
    });
    expect(r.kind).toBe("collect");
  });
});

describe("semana atípica", () => {
  it("cumpre a condição A, mas não corta", () => {
    const r = base({
      measurements: [...waistWeek(W1, 83), ...waistWeek(W0, 83.6)],
      weights: [...weightWeek(W1, 65), ...weightWeek(W0, 65.3)],
      atypicalWeek: true,
    });
    expect(r.kind).toBe("atypical");
    expect(r.adjustment).toBeNull();
    expect(r.message).toMatch(/atípica/);
  });
});

describe("manter e recolher mais dados", () => {
  it("sem medições de cintura", () => {
    expect(base().kind).toBe("collect");
  });

  it("semana atual com uma medição única (dados antigos)", () => {
    const r = base({ measurements: [{ date: "2026-12-13", waistCm: 83 }, { date: "2026-12-20", waistCm: 84.5 }] });
    expect(r.kind).toBe("collect");
    expect(r.message).toMatch(/medição única/);
  });

  it("semana atual com poucos dados (3 medições)", () => {
    const r = base({ measurements: [...waistWeek(W1, 83), ...waistWeek("2026-12-18", 84, 3)] });
    expect(r.kind).toBe("collect");
    expect(r.message).toMatch(/3 medições/);
  });

  it("sem semana anterior para comparar", () => {
    expect(base({ measurements: waistWeek(W0, 83) }).kind).toBe("collect");
  });
});

describe("outras recomendações", () => {
  const arms = (pairs: Array<[string, number]>): CheckInRow[] =>
    pairs.map(([date, v]) => ({ date, armRightCm: v, armLeftCm: v }));

  it("cintura a descer, braço (4 semanas) e força a cair → subir 125 kcal", () => {
    const r = base({
      measurements: [
        ...waistWeek(W1, 84),
        ...waistWeek(W0, 83.4).map((m, i) => (i === 6 ? { ...m, strengthDropping: true } : m)),
        ...arms([["2026-11-22", 35.5], ["2026-12-20", 34.8]]),
      ],
    });
    expect(r.kind).toBe("raise");
    expect(r.adjustment).toEqual({ ...RAISE });
  });

  it("cintura a descer, braço igual → perfeito", () => {
    const r = base({ measurements: [...waistWeek(W1, 84), ...waistWeek(W0, 83.5), ...arms([["2026-11-22", 35], ["2026-12-20", 35.2]])] });
    expect(r.kind).toBe("perfect");
  });

  it("cintura igual, braço a subir (4 semanas) → a funcionar", () => {
    const r = base({ measurements: [...waistWeek(W1, 84), ...waistWeek(W0, 84.1), ...arms([["2026-11-22", 35], ["2026-12-20", 35.6]])] });
    expect(r.kind).toBe("working");
  });

  it("cintura e braço iguais há 6 semanas → aviso de estagnação, sem corte", () => {
    const r = base({
      measurements: [
        ...waistWeek("2026-11-02", 84),
        ...waistWeek(W1, 84.1),
        ...waistWeek(W0, 84.1),
        ...arms([["2026-11-08", 35], ["2026-12-20", 35.1]]),
      ],
    });
    expect(r.kind).toBe("stagnation");
    expect(r.adjustment).toBeNull();
  });

  it("a regra antiga 'cintura igual e braço igual → cortar' já não existe", () => {
    const r = base({ measurements: [...waistWeek(W1, 84), ...waistWeek(W0, 84), ...arms([["2026-11-22", 35], ["2026-12-20", 35]])] });
    expect(r.adjustment).toBeNull();
  });
});

describe("altura do check-in", () => {
  it("ajuste há 7 dias → faltam 14 dias", () => {
    const r = recommend({ measurements: [], weights: [], lastGoalDate: "2026-12-13", today: TODAY });
    expect(r.due).toBe(false);
    expect(r.daysUntilDue).toBe(14);
  });
});

describe("applyAdjustment", () => {
  const goal = { calories: 2200, proteinG: 160, carbsG: 250, fatG: 62 };

  it("condição A: 2200 → 2050 kcal, hidratos 250 → 212 g, gordura e proteína iguais", () => {
    expect(applyAdjustment(goal, CUT_A)).toEqual({ calories: 2050, proteinG: 160, carbsG: 212, fatG: 62 });
  });

  it("gordura nunca abaixo de 50 g", () => {
    expect(applyAdjustment({ ...goal, fatG: 55 }, { kcal: -150, carbsG: 0, fatG: -17 }).fatG).toBe(50);
  });

  it("hidratos nunca abaixo de 0", () => {
    expect(applyAdjustment({ ...goal, carbsG: 20 }, CUT_A).carbsG).toBe(0);
  });
});
