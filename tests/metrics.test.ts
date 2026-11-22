import { describe, expect, it } from "vitest";
import {
  AVERAGE_EQUAL_CM,
  SINGLE_EQUAL_CM,
  averagedSummary,
  compareWindows,
  currentWindow,
  firstWindow,
  movingAverage,
  previousWindow,
  reliabilityOf,
  seriesOf,
  slowSummary,
  streakDays,
  toneOf,
  trendOf,
  weekStart,
  weightAt,
  weightSeries,
  windowStat,
  type Point,
} from "@/lib/metrics";

const pts = (pairs: Array<[string, number]>): Point[] => pairs.map(([date, value]) => ({ date, value }));

/** Cintura diária de `from` (inclusive) durante `n` dias, valor `v` (+ passo por dia). */
function daily(from: string, n: number, v: number, step = 0): Point[] {
  const out: Point[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    out.push({ date: d.toISOString().slice(0, 10), value: Math.round((v + step * i) * 100) / 100 });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

describe("fiabilidade da média de 7 dias", () => {
  it.each([
    [1, "medicao-unica"],
    [2, "poucos-dados"],
    [3, "poucos-dados"],
    [4, "fiavel"],
    [7, "fiavel"],
  ] as const)("%i medições → %s", (n, expected) => {
    expect(reliabilityOf(n)).toBe(expected);
  });

  it("janela de 7 dias inclui o dia final e os 6 anteriores", () => {
    const w = windowStat(daily("2026-11-10", 10, 83), "2026-11-19")!;
    expect(w.from).toBe("2026-11-13");
    expect(w.count).toBe(7);
    expect(w.value).toBe(83);
  });

  it("sem pontos na janela → null", () => {
    expect(windowStat(pts([["2026-11-01", 83]]), "2026-11-20")).toBeNull();
  });
});

describe("limiares de erro de medição", () => {
  it("valor isolado: < 0,5 cm é igual", () => {
    const a = windowStat(pts([["2026-11-15", 83]]), "2026-11-15")!;
    const b = windowStat(pts([["2026-11-22", 83.4]]), "2026-11-22")!;
    const c = compareWindows(b, a);
    expect(c.threshold).toBe(SINGLE_EQUAL_CM);
    expect(c.trend).toBe("same");
  });

  it("valor isolado: 0,5 cm já conta como a subir", () => {
    const a = windowStat(pts([["2026-11-15", 83]]), "2026-11-15")!;
    const b = windowStat(pts([["2026-11-22", 83.5]]), "2026-11-22")!;
    expect(compareWindows(b, a).trend).toBe("up");
  });

  it("médias fiáveis: < 0,3 cm é igual, 0,3 já conta", () => {
    const series = [...daily("2026-11-01", 7, 83), ...daily("2026-11-08", 7, 83.29)];
    const cur = windowStat(series, "2026-11-14")!;
    const prev = windowStat(series, "2026-11-07")!;
    const c = compareWindows(cur, prev);
    expect(c.threshold).toBe(AVERAGE_EQUAL_CM);
    expect(c.trend).toBe("same");

    const series2 = [...daily("2026-11-01", 7, 83), ...daily("2026-11-08", 7, 83.3)];
    expect(compareWindows(windowStat(series2, "2026-11-14")!, windowStat(series2, "2026-11-07")!).trend).toBe("up");
  });

  it("média fiável contra uma medição única usa o limiar de 0,5 cm", () => {
    const series = [{ date: "2026-11-01", value: 84 }, ...daily("2026-11-08", 7, 83.6)];
    const c = compareWindows(windowStat(series, "2026-11-14")!, windowStat(series, "2026-11-07")!);
    expect(c.threshold).toBe(SINGLE_EQUAL_CM);
    expect(c.trend).toBe("same"); // −0,4 cm < 0,5
  });

  it("peso: < 0,2 kg é igual", () => {
    const series = [...daily("2026-11-01", 7, 65), ...daily("2026-11-08", 7, 65.15)];
    const c = compareWindows(windowStat(series, "2026-11-14")!, windowStat(series, "2026-11-07")!, "kg");
    expect(c.trend).toBe("same");
  });

  it("trendOf não falha por erros de vírgula flutuante", () => {
    expect(trendOf(83.8 - 83.5, 0.3)).toBe("up");
  });
});

describe("dados antigos (semanais) misturados com dados novos (diários)", () => {
  // Como na produção: cintura a 8, 15 e 22 nov (uma por semana), depois diária a partir de 23 nov.
  const legacy = pts([
    ["2026-11-08", 83.5],
    ["2026-11-15", 83.0],
    ["2026-11-22", 84.0],
  ]);
  const mixed = [...legacy, ...daily("2026-11-23", 7, 83.6)];

  it("semana antiga com uma medição: esse valor é o valor da semana, marcado como medição única", () => {
    const w = currentWindow(legacy, "2026-11-22")!;
    expect(w.value).toBe(84);
    expect(w.reliability).toBe("medicao-unica");
  });

  it("vs anterior com dados antigos: compara com a medição da semana anterior (limiar 0,5)", () => {
    const s = averagedSummary(legacy, "2026-11-22")!;
    expect(s.previous?.base.value).toBe(83);
    expect(s.previous?.delta).toBe(1);
    expect(s.previous?.trend).toBe("up");
    expect(s.sinceStart?.base.value).toBe(83.5);
  });

  it("primeira semana diária: média fiável; a anterior é a medição única de 22 nov", () => {
    const s = averagedSummary(mixed, "2026-11-29")!;
    expect(s.current.reliability).toBe("fiavel");
    expect(s.current.count).toBe(7);
    expect(s.previous?.base.reliability).toBe("medicao-unica");
    expect(s.previous?.base.value).toBe(84);
    expect(s.previous?.threshold).toBe(SINGLE_EQUAL_CM);
    expect(s.previous?.trend).toBe("same"); // −0,4 cm < 0,5
  });

  it("os dados antigos continuam nos gráficos (média móvel ponto a ponto)", () => {
    const ma = movingAverage(mixed);
    expect(ma).toHaveLength(10);
    expect(ma[0]).toMatchObject({ date: "2026-11-08", value: 83.5, count: 1 });
  });

  it("primeira semana e semana anterior com lacunas", () => {
    expect(firstWindow(legacy)?.to).toBe("2026-11-14");
    const cur = currentWindow(mixed, "2026-11-29")!;
    expect(previousWindow(mixed, cur)?.lastDate).toBe("2026-11-22");
  });

  it("'desde o início' só aparece quando a primeira semana não se cruza com a atual", () => {
    expect(averagedSummary(pts([["2026-11-20", 83], ["2026-11-22", 83]]), "2026-11-22")?.sinceStart).toBeNull();
  });
});

describe("peso: média de 7 dias das pesagens diárias", () => {
  const weights = daily("2026-11-09", 14, 65.0, 0.01);
  const legacyMeasurements = [
    { date: "2026-11-08", weightKg: 65.4 },
    { date: "2026-11-15", weightKg: 66 }, // havia pesagem diária neste dia: é ignorado
  ];

  it("a pesagem diária tem prioridade; o peso das medições só preenche dias sem pesagem", () => {
    const s = weightSeries(
      weights.map((w) => ({ date: w.date, weightKg: w.value })),
      legacyMeasurements,
    );
    expect(s.find((p) => p.date === "2026-11-08")?.value).toBe(65.4);
    expect(s.find((p) => p.date === "2026-11-15")?.value).toBe(65.06);
    expect(s).toHaveLength(15);
  });

  it("Antes/Agora a 22 nov usa a média das pesagens de 16–22 nov, não os 66 kg de 15 nov", () => {
    const s = weightSeries(weights.map((w) => ({ date: w.date, weightKg: w.value })), legacyMeasurements);
    const w = weightAt(s, "2026-11-22")!;
    expect(w.count).toBe(7);
    expect(w.from).toBe("2026-11-16");
    expect(w.value).toBeCloseTo(65.1, 2);
  });
});

describe("braço, peito, ombros: conclusão a 4 semanas", () => {
  it("variação face ao último registo + conclusão sobre ~28 dias", () => {
    const arms = pts([
      ["2026-10-25", 35.0],
      ["2026-11-01", 35.1],
      ["2026-11-08", 35.2],
      ["2026-11-15", 35.3],
      ["2026-11-22", 35.6],
    ]);
    const s = slowSummary(arms, "2026-11-22")!;
    expect(s.vsLast?.delta).toBe(0.3);
    expect(s.vsLast?.trend).toBe("same"); // 0,3 < 0,5 num valor isolado
    expect(s.fourWeeks?.base.date).toBe("2026-10-25");
    expect(s.fourWeeks?.delta).toBe(0.6);
    expect(s.fourWeeks?.trend).toBe("up");
  });

  it("sem 4 semanas de dados → sem conclusão", () => {
    const s = slowSummary(pts([["2026-11-08", 35], ["2026-11-22", 35.5]]), "2026-11-22")!;
    expect(s.fourWeeks).toBeNull();
    expect(s.vsLast?.trend).toBe("up");
  });
});

describe("cores e séries", () => {
  it("cintura a descer é bom, braço a descer é mau, igual é neutro", () => {
    expect(toneOf("waistCm", "down")).toBe("good");
    expect(toneOf("armRightCm", "down")).toBe("bad");
    expect(toneOf("waistCm", "same")).toBe("same");
    expect(toneOf("weightKg", "up")).toBe("neutral");
  });

  it("seriesOf ignora registos sem a medida e ordena por data", () => {
    const s = seriesOf(
      [
        { date: "2026-11-22", waistCm: 84 },
        { date: "2026-11-08", waistCm: 83.5, armRightCm: 35 },
        { date: "2026-11-15" },
      ],
      (r) => r.waistCm,
    );
    expect(s.map((p) => p.date)).toEqual(["2026-11-08", "2026-11-22"]);
  });

  it("segunda-feira da semana", () => {
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // domingo → segunda anterior
    expect(weekStart("2026-11-16")).toBe("2026-11-16");
  });
});

describe("dias seguidos", () => {
  it("conta para trás a partir de hoje", () => {
    expect(streakDays(["2026-11-20", "2026-11-21", "2026-11-22"], "2026-11-22")).toBe(3);
  });

  it("sem registo hoje, a sequência de ontem continua viva", () => {
    expect(streakDays(["2026-11-20", "2026-11-21"], "2026-11-22")).toBe(2);
  });

  it("um buraco de um dia reinicia a contagem", () => {
    expect(streakDays(["2026-11-18", "2026-11-19", "2026-11-21", "2026-11-22"], "2026-11-22")).toBe(2);
    expect(streakDays(["2026-11-19"], "2026-11-22")).toBe(0);
    expect(streakDays([], "2026-11-22")).toBe(0);
  });
});
