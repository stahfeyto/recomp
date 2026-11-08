import { describe, expect, it } from "vitest";
import {
  armAverage,
  daysBetween,
  deltaTone,
  detectRecords,
  dueMeasures,
  greeting,
  lastKnownValues,
  movingAverage7,
  nextCheckIn,
  ratio,
  round1,
  seriesSummary,
  shiftISODate,
  weeklyAverage,
} from "@/lib/calculations";
import { KCAL_MISMATCH, macroKcal, macroShares, redistribute } from "@/lib/macros";
import { parseDecimal } from "@/lib/number";

describe("datas", () => {
  it("shiftISODate atravessa meses e anos", () => {
    expect(shiftISODate("2026-11-08", -7)).toBe("2026-11-01");
    expect(shiftISODate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftISODate("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("daysBetween", () => {
    expect(daysBetween("2026-10-18", "2026-11-08")).toBe(21);
  });
});

describe("média semanal das pesagens", () => {
  const weights = [
    { date: "2026-11-08", weightKg: 65.0 },
    { date: "2026-11-05", weightKg: 65.4 },
    { date: "2026-11-02", weightKg: 66.0 },
    { date: "2026-11-01", weightKg: 70.0 }, // fora da janela de 7 dias
  ];

  it("usa só os últimos 7 dias (hoje incluído)", () => {
    expect(weeklyAverage(weights, "2026-11-08")).toEqual({ average: 65.47, count: 3 });
  });

  it("sem pesagens na janela → null", () => {
    expect(weeklyAverage(weights, "2026-12-31")).toBeNull();
  });

  it("média móvel de 7 dias por pesagem", () => {
    const ma = movingAverage7(weights);
    expect(ma.at(-1)).toEqual({ date: "2026-11-08", average: 65.47, count: 3 });
    expect(ma[0]).toEqual({ date: "2026-11-01", average: 70, count: 1 });
  });
});

describe("rácios", () => {
  it("ombros/cintura com os dados iniciais: 114 / 83,5 = 1,37", () => {
    expect(ratio(114, 83.5)).toBe(1.37);
  });

  it("cintura/altura com os dados iniciais: 83,5 / 171 = 0,49", () => {
    expect(ratio(83.5, 171)).toBe(0.49);
  });

  it("média dos braços só com os dois medidos", () => {
    expect(armAverage({ date: "x", armRightCm: 35.5, armLeftCm: 34.5 })).toBe(35);
    expect(armAverage({ date: "x", armRightCm: 35.5 })).toBeNull();
  });

  it("round1 evita erros de vírgula flutuante", () => {
    expect(round1(83.7 - 84)).toBe(-0.3);
  });
});

describe("variação com juízo para a recomposição", () => {
  it.each([
    ["waistCm", -0.5, "good"],
    ["waistCm", 0.5, "bad"],
    ["waistCm", -0.2, "same"],
    ["armRightCm", 0.4, "good"],
    ["armRightCm", -0.4, "bad"],
    ["weightKg", -1, "neutral"],
  ] as const)("%s %s → %s", (key, delta, tone) => {
    expect(deltaTone(key, delta)).toBe(tone);
  });
});

describe("recordes", () => {
  const others = [{ date: "2026-11-01", waistCm: 84.1, armRightCm: 35 }];

  it("menor cintura e maior braço de sempre", () => {
    expect(detectRecords({ date: "2026-11-08", waistCm: 82.6, armRightCm: 36.4 }, others).map((r) => r.kind)).toEqual([
      "waist",
      "arm",
    ]);
  });

  it("ao editar, não repete um recorde que já existia", () => {
    const before = { date: "2026-11-08", waistCm: 82.6, armRightCm: 36.4 };
    const after = { date: "2026-11-08", waistCm: 82.4, armRightCm: 36.4 };
    expect(detectRecords(after, others, before).map((r) => r.kind)).toEqual(["waist"]);
  });

  it("sem histórico não há recorde", () => {
    expect(detectRecords({ date: "x", waistCm: 80 }, [])).toEqual([]);
  });
});

describe("últimos valores e resumo de uma série", () => {
  const rows = [
    { id: 1, date: "2026-11-08", waistCm: 83 },
    { id: 2, date: "2026-11-01", waistCm: 84, armRightCm: 35 },
    { id: 3, date: "2026-10-25", waistCm: 84.5 },
  ];

  it("último valor conhecido de cada medida", () => {
    const last = lastKnownValues(rows);
    expect(last.waistCm).toEqual({ value: 83, date: "2026-11-08" });
    expect(last.armRightCm).toEqual({ value: 35, date: "2026-11-01" });
  });

  it("pode ignorar o registo em edição e o que vem depois de uma data", () => {
    expect(lastKnownValues(rows, { excludeId: 1 }).waistCm?.value).toBe(84);
    expect(lastKnownValues(rows, { beforeDate: "2026-11-01" }).waistCm?.value).toBe(84.5);
  });

  it("seriesSummary: atual, anterior e início", () => {
    const s = seriesSummary(rows, (r) => r.waistCm);
    expect(s).toMatchObject({ current: { value: 83 }, previous: { value: 84 }, first: { value: 84.5 } });
  });
});

describe("check-in e lembretes", () => {
  it("próximo check-in 21 dias depois do último ajuste", () => {
    expect(nextCheckIn(["2026-05-10", "2026-10-18", "2027-01-01"], "2026-11-08")).toEqual({
      date: "2026-11-08",
      daysLeft: 0,
      since: "2026-10-18",
    });
  });

  it("cintura todas as semanas, braços a cada 2 semanas", () => {
    const due = dueMeasures(
      [
        { date: "2026-11-05", waistCm: 83 },
        { date: "2026-10-20", armRightCm: 35 },
      ],
      "2026-11-08",
    );
    expect(due).toMatchObject({ waist: false, arms: true, daysSinceWaist: 3, daysSinceArms: 19 });
  });

  it("saudação conforme a hora", () => {
    expect(greeting(8)).toBe("Bom dia");
    expect(greeting(15)).toBe("Boa tarde");
    expect(greeting(22)).toBe("Boa noite");
    expect(greeting(3)).toBe("Boa noite");
  });
});

describe("macros", () => {
  const m = { proteinG: 160, carbsG: 250, fatG: 62 };

  it("4/4/9: 160×4 + 250×4 + 62×9 = 2198 kcal", () => {
    expect(macroKcal(m)).toBe(2198);
  });

  it("as metas iniciais (2200 kcal) estão dentro da tolerância", () => {
    expect(Math.abs(2200 - macroKcal(m))).toBeLessThanOrEqual(KCAL_MISMATCH);
  });

  it("fatias das calorias somam 1", () => {
    const s = macroShares(m);
    expect(s.proteinG + s.carbsG + s.fatG).toBeCloseTo(1, 6);
  });

  it("com calorias bloqueadas, subir a proteína tira aos outros dois e mantém o total", () => {
    const next = redistribute(m, "proteinG", 200, 2200);
    expect(next.proteinG).toBe(200);
    expect(next.carbsG).toBeLessThan(250);
    expect(next.fatG).toBeLessThan(62);
    expect(Math.abs(macroKcal(next) - 2200)).toBeLessThanOrEqual(6);
  });
});

describe("números escritos à portuguesa", () => {
  it.each([
    ["83,5", 83.5],
    ["83.5", 83.5],
    [" 65,4 ", 65.4],
    ["", null],
    ["abc", null],
    ["8,3,1", null],
  ] as const)("%j → %s", (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });
});
