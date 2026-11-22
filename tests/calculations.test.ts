import { describe, expect, it } from "vitest";
import {
  daysBetween,
  detectRecords,
  dueMeasures,
  greeting,
  lastKnownValues,
  nextCheckIn,
  ratio,
  round1,
  shiftISODate,
} from "@/lib/calculations";
import { KCAL_MISMATCH, macroKcal, macroShares, redistribute } from "@/lib/macros";
import { parseDecimal } from "@/lib/number";
import { parseMeasurementForm, parseTodayForm } from "@/lib/validation/measurement";

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

describe("rácios", () => {
  it("ombros/cintura com os dados iniciais: 114 / 83,5 = 1,37", () => {
    expect(ratio(114, 83.5)).toBe(1.37);
  });

  it("cintura/altura com os dados iniciais: 83,5 / 171 = 0,49", () => {
    expect(ratio(83.5, 171)).toBe(0.49);
  });

  it("round1 evita erros de vírgula flutuante", () => {
    expect(round1(83.7 - 84)).toBe(-0.3);
  });
});

describe("recordes de braço", () => {
  const others = [{ date: "2026-11-01", waistCm: 84.1, armRightCm: 35 }];

  it("maior braço de sempre", () => {
    expect(detectRecords({ date: "2026-11-08", armRightCm: 36.4 }, others).map((r) => r.kind)).toEqual(["arm"]);
  });

  it("ao editar, não repete um recorde que já existia", () => {
    const before = { date: "2026-11-08", armRightCm: 36.4 };
    expect(detectRecords({ date: "2026-11-08", armRightCm: 36.4, waistCm: 82 }, others, before)).toEqual([]);
  });

  it("a cintura já não gera recordes (com medições diárias seria ruído)", () => {
    expect(detectRecords({ date: "x", waistCm: 80 }, others)).toEqual([]);
  });
});

describe("últimos valores", () => {
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
});

describe("check-in e lembretes", () => {
  it("próximo check-in 21 dias depois do último ajuste", () => {
    expect(nextCheckIn(["2026-05-10", "2026-10-18", "2027-01-01"], "2026-11-08")).toEqual({
      date: "2026-11-08",
      daysLeft: 0,
      since: "2026-10-18",
    });
  });

  it("cintura todos os dias; braço, peito e ombros 1× por semana", () => {
    const due = dueMeasures(
      [
        { date: "2026-11-08", waistCm: 83 },
        { date: "2026-10-20", armRightCm: 35 },
      ],
      "2026-11-08",
    );
    expect(due).toEqual({ waistToday: true, weekly: true, daysSinceWeekly: 19 });
    expect(dueMeasures([{ date: "2026-11-05", chestCm: 95 }], "2026-11-08")).toMatchObject({ waistToday: false, weekly: false });
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

describe("formulários", () => {
  const fd = (fields: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    return f;
  };

  it("registo rápido: peso e cintura com vírgula ou ponto", () => {
    const r = parseTodayForm(fd({ date: "2026-11-22", weightKg: "65,4", waistCm: "83.5" }));
    expect(r).toEqual({ ok: true, data: { date: "2026-11-22", weightKg: 65.4, waistCm: 83.5 } });
  });

  it("registo rápido: só a cintura (o peso não vem no formulário)", () => {
    const r = parseTodayForm(fd({ date: "2026-11-22", waistCm: "83,1" }));
    expect(r).toEqual({ ok: true, data: { date: "2026-11-22", weightKg: null, waistCm: 83.1 } });
  });

  it("registo rápido vazio → erro", () => {
    expect(parseTodayForm(fd({ date: "2026-11-22" })).ok).toBe(false);
  });

  it("formulário completo só devolve os campos que vêm nele (o peso antigo não é tocado)", () => {
    const r = parseMeasurementForm(fd({ date: "2026-11-22", armRightCm: "35,9", armLeftCm: "", notes: "" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.provided).toEqual(["armRightCm", "armLeftCm", "notes"]);
      expect("weightKg" in r.data).toBe(false);
      expect("waistCm" in r.data).toBe(false);
      expect(r.data.armLeftCm).toBeNull();
    }
  });
});
