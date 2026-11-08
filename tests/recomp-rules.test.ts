import { describe, expect, it } from "vitest";
import {
  CARB_STEP_KCAL,
  FAT_CUT_KCAL,
  applyAdjustment,
  recommend,
  trend,
  type CheckInRow,
} from "@/lib/recomp-rules";

const TODAY = "2026-11-08";
const GOAL = "2026-10-01"; // último ajuste há mais de 21 dias

/**
 * Três registos em 3 semanas: cintura w0 → w1 e braços a0 → a1 (os dois braços iguais).
 * A janela "antes" começa a 18 out (há 21 dias) e a "depois" acaba a 8 nov.
 */
function rows(w0: number, w1: number, a0: number | null, a1: number | null, strengthDropping = false): CheckInRow[] {
  return [
    { date: "2026-10-18", waistCm: w0, ...(a0 !== null ? { armRightCm: a0, armLeftCm: a0 } : {}) },
    { date: "2026-11-01", waistCm: (w0 + w1) / 2 },
    {
      date: "2026-11-08",
      waistCm: w1,
      ...(a1 !== null ? { armRightCm: a1, armLeftCm: a1 } : {}),
      strengthDropping,
    },
  ];
}

describe("trend (±0,3 cm = igual)", () => {
  it.each([
    [-0.3, "down"],
    [-0.29, "same"],
    [0, "same"],
    [0.29, "same"],
    [0.3, "up"],
  ] as const)("%s cm → %s", (delta, expected) => {
    expect(trend(delta)).toBe(expected);
  });
});

describe("tabela da secção 7.6", () => {
  it("cintura a descer, braço a subir → perfeito, sem ajuste", () => {
    const r = recommend(rows(84, 83.4, 35, 35.4), GOAL, TODAY);
    expect(r.kind).toBe("perfect");
    expect(r.adjustment).toBeNull();
  });

  it("cintura a descer, braço igual → perfeito", () => {
    expect(recommend(rows(84, 83.4, 35, 35.1), GOAL, TODAY).kind).toBe("perfect");
  });

  it("cintura igual, braço a subir → recomposição a funcionar", () => {
    const r = recommend(rows(84, 83.9, 35, 35.4), GOAL, TODAY);
    expect(r.kind).toBe("working");
    expect(r.adjustment).toBeNull();
  });

  it("cintura igual, braço igual → retirar 100–150 kcal (hidratos)", () => {
    const r = recommend(rows(84, 84.1, 35, 35.1), GOAL, TODAY);
    expect(r.kind).toBe("cut");
    expect(r.adjustment).toEqual({ kcal: -CARB_STEP_KCAL, carbsG: -31, fatG: 0 });
  });

  it("cintura a subir ≥ 0,5 cm (braço a subir) → retirar 150 kcal à gordura", () => {
    const r = recommend(rows(84, 84.5, 35, 35.5), GOAL, TODAY);
    expect(r.kind).toBe("cut-fat");
    expect(r.adjustment).toEqual({ kcal: -FAT_CUT_KCAL, carbsG: 0, fatG: -17 });
  });

  it("cintura a subir ≥ 0,5 cm (braço igual) → retirar 150 kcal à gordura", () => {
    expect(recommend(rows(84, 84.6, 35, 35), GOAL, TODAY).kind).toBe("cut-fat");
  });

  it("cintura a descer, braço e força a cair → subir 100–150 kcal", () => {
    const r = recommend(rows(84, 83.4, 35, 34.6, true), GOAL, TODAY);
    expect(r.kind).toBe("raise");
    expect(r.strengthDropping).toBe(true);
    expect(r.adjustment).toEqual({ kcal: CARB_STEP_KCAL, carbsG: 31, fatG: 0 });
  });
});

describe("casos que a tabela não cobre → manter e vigiar", () => {
  it("cintura a descer, braço a cair, força estável", () => {
    expect(recommend(rows(84, 83.4, 35, 34.6, false), GOAL, TODAY).kind).toBe("watch");
  });

  it("cintura igual, braço a cair", () => {
    expect(recommend(rows(84, 84, 35, 34.6), GOAL, TODAY).kind).toBe("watch");
  });

  it("cintura a subir entre 0,3 e 0,5 cm", () => {
    expect(recommend(rows(84, 84.4, 35, 35), GOAL, TODAY).kind).toBe("watch");
  });
});

describe("limites e dados em falta", () => {
  it("−0,29 cm conta como igual (não é arredondado para −0,3)", () => {
    expect(recommend(rows(84, 83.71, 35, 35), GOAL, TODAY).kind).toBe("cut");
  });

  it("+0,45 cm ainda não corta à gordura (não é arredondado para 0,5)", () => {
    expect(recommend(rows(84, 84.45, 35, 35), GOAL, TODAY).kind).toBe("watch");
  });

  it("cintura igual sem medida dos braços → pede para medir os braços", () => {
    expect(recommend(rows(84, 84, null, null), GOAL, TODAY).kind).toBe("measure-arms");
  });

  it("sem medições → dados insuficientes", () => {
    expect(recommend([], GOAL, TODAY).kind).toBe("insufficient");
  });

  it("ajuste há menos de 14 dias → ainda é cedo e não está na altura", () => {
    const r = recommend(rows(84, 84, 35, 35), "2026-11-01", TODAY);
    expect(r.kind).toBe("insufficient");
    expect(r.due).toBe(false);
    expect(r.daysUntilDue).toBe(14);
  });

  it("21 dias depois do ajuste → está na altura do check-in", () => {
    const r = recommend(rows(84, 84.6, 35, 35), "2026-10-18", TODAY);
    expect(r.due).toBe(true);
    expect(r.daysUntilDue).toBe(0);
  });

  it("medições no futuro não contam", () => {
    const future: CheckInRow[] = [...rows(84, 83.4, 35, 35.4), { date: "2026-12-01", waistCm: 90 }];
    expect(recommend(future, GOAL, TODAY).kind).toBe("perfect");
  });
});

describe("applyAdjustment", () => {
  const goal = { calories: 2200, proteinG: 160, carbsG: 250, fatG: 62 };

  it("−150 kcal à gordura: 2200 → 2050 kcal, gordura 62 → 45 g, proteína igual", () => {
    expect(applyAdjustment(goal, { kcal: -150, carbsG: 0, fatG: -17 })).toEqual({
      calories: 2050,
      proteinG: 160,
      carbsG: 250,
      fatG: 45,
    });
  });

  it("+125 kcal em hidratos", () => {
    expect(applyAdjustment(goal, { kcal: 125, carbsG: 31, fatG: 0 })).toMatchObject({ calories: 2325, carbsG: 281 });
  });

  it("nunca fica abaixo de zero", () => {
    expect(applyAdjustment({ calories: 100, proteinG: 0, carbsG: 10, fatG: 5 }, { kcal: -150, carbsG: -31, fatG: -17 })).toEqual({
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });
});
