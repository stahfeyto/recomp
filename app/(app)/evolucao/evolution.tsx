"use client";

import { useMemo, useState } from "react";
import type { DailyAverageRow } from "@/components/charts/daily-average-chart";
import { DailyAverageChart, MeasureChart, RatioChart, WaistArmChart } from "@/components/charts/lazy";
import type { MeasurePoint } from "@/components/charts/measure-chart";
import type { RatioRow } from "@/components/charts/ratio-chart";
import { CHART } from "@/components/charts/theme";
import type { GoalMark, WaistArmRow } from "@/components/charts/waist-arm-chart";
import { Card } from "@/components/ui/card";
import { SHOULDER_WAIST_IDEAL, isoToTime, periodStart } from "@/lib/calculations";
import type { EvolutionData } from "@/lib/data/evolution";
import { formatDate, formatDayMonth, formatSigned } from "@/lib/format";
import { MEASURES } from "@/lib/measures";
import {
  armAverage,
  lastAt,
  movingAverage,
  ratio,
  round1,
  seriesOf,
  weightSeries,
  windowStat,
  type Point,
} from "@/lib/metrics";
import { formatDecimal } from "@/lib/number";
import { Comparator } from "./comparator";

const PERIODS = [
  { id: "4s", label: "4 semanas", days: 28 },
  { id: "3m", label: "3 meses", days: 91 },
  { id: "6m", label: "6 meses", days: 182 },
  { id: "all", label: "Tudo", days: null },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

/** Medidas com gráfico próprio (peso e cintura) ficam fora dos mini-gráficos. */
const DAILY_KEYS = new Set(["weightKg", "waistCm"]);

/** Pontos + média de 7 dias, calculada sobre a série inteira (inclui dias antes do período). */
function dailyRows(points: Point[], inRange: (d: string) => boolean): DailyAverageRow[] {
  return movingAverage(points)
    .map((ma, i) => ({ t: isoToTime(ma.date), value: points[i].value, avg: ma.value, count: ma.count, date: ma.date }))
    .filter((r) => inRange(r.date))
    .map(({ date: _d, ...r }) => r);
}

export function Evolution({ data }: { data: EvolutionData }) {
  const [period, setPeriod] = useState<PeriodId>("3m");
  const days = PERIODS.find((p) => p.id === period)!.days;

  const view = useMemo(() => {
    const from = periodStart(data.today, days);
    const inRange = (d: string) => (!from || d >= from) && d <= data.today;

    const waistPts = seriesOf(data.measurements, (r) => r.waistCm);
    const weightPts = weightSeries(data.weights, data.measurements);
    const armPts = seriesOf(data.measurements, armAverage);

    const allDates = [...waistPts, ...weightPts, ...armPts].map((p) => p.date).filter(inRange).sort();
    const start = from ?? allDates[0] ?? data.today;
    const domain: [number, number] = [isoToTime(start), isoToTime(data.today)];

    const waistRows = dailyRows(waistPts, inRange);
    const weightRows = dailyRows(weightPts, inRange);

    // Cintura vs braço: a cintura em média de 7 dias, o braço nos registos semanais;
    // variação desde o primeiro valor do período.
    const waistMA = new Map(movingAverage(waistPts).map((p) => [p.date, p.value]));
    const armByDate = new Map(armPts.map((p) => [p.date, p.value]));
    const waArDates = [...new Set([...waistPts, ...armPts].map((p) => p.date))].filter(inRange).sort();
    const waistBase = waArDates.map((d) => waistMA.get(d)).find((v) => v !== undefined) ?? null;
    const armBase = waArDates.map((d) => armByDate.get(d)).find((v) => v !== undefined) ?? null;
    const waistArm: WaistArmRow[] = [];
    {
      let lastWaist: WaistArmRow["waistLast"] = null;
      let lastArm: WaistArmRow["armLast"] = null;
      for (const date of waArDates) {
        const w = waistMA.get(date) ?? null;
        const a = armByDate.get(date) ?? null;
        const waistD = w !== null && waistBase !== null ? round1(w - waistBase) : null;
        const armD = a !== null && armBase !== null ? round1(a - armBase) : null;
        waistArm.push({ t: isoToTime(date), waist: w, arm: a, waistD, armD, waistLast: lastWaist, armLast: lastArm });
        if (waistD !== null) lastWaist = { d: waistD, value: w!, date };
        if (armD !== null) lastArm = { d: armD, value: a!, date };
      }
    }

    // Ombros/cintura: ombros (último registo) sobre a média de 7 dias da cintura.
    const shoulderPts = seriesOf(data.measurements, (r) => r.shouldersCm);
    const ratios: RatioRow[] = waArDates
      .map((date) => {
        const s = lastAt(shoulderPts, date);
        const w = windowStat(waistPts, date);
        return s && w ? { t: isoToTime(date), ratio: ratio(s.value, w.value) } : null;
      })
      .filter((r): r is RatioRow => r !== null);

    // Mini-gráficos das medidas semanais
    const perMeasure = MEASURES.filter((def) => !DAILY_KEYS.has(def.key))
      .map((def) => ({
        def,
        points: seriesOf(data.measurements, (r) => r[def.key])
          .filter((p) => inRange(p.date))
          .map((p) => ({ t: isoToTime(p.date), value: p.value })) as MeasurePoint[],
      }))
      .filter((s) => s.points.length > 0);

    const goals: GoalMark[] = data.goals
      .filter((g) => inRange(g.date))
      .map((g) => ({ t: isoToTime(g.date), label: g.label }));

    return { domain, waistArm, waistRows, weightRows, ratios, perMeasure, goals, start, hasAny: allDates.length > 0 };
  }, [data, days]);

  const lastWA = view.waistArm.at(-1);
  const canWiden = view.hasAny && period !== "all";

  return (
    <div className="grid gap-6">
      <div className="evo-filters" role="group" aria-label="Período dos gráficos">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="evo-filters__btn"
            aria-pressed={period === p.id}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Cintura vs braço */}
      <Card className="evo-card" spotlight={false}>
        <header className="evo-card__head">
          <div className="grid gap-1">
            <h2 className="text-xl">Cintura vs braço</h2>
            <p className="text-sm text-ice-300">
              Variação em cm desde{" "}
              {formatDate(view.waistArm[0] ? new Date(view.waistArm[0].t).toISOString().slice(0, 10) : view.start)}. Cintura em
              média de 7 dias, braço nos registos semanais. A cintura decide.
            </p>
          </div>
          <Legend
            items={[
              { label: "Cintura (média 7 dias)", color: CHART.cobalt },
              { label: "Braço (média D/E)", color: CHART.lime },
            ]}
          />
        </header>
        {view.waistArm.length >= 2 ? (
          <>
            <WaistArmChart rows={view.waistArm} goals={view.goals} domain={view.domain} />
            {lastWA && (
              <p className="sr-only">
                Cintura {lastWA.waistD !== null ? formatSigned(lastWA.waistD) : "sem dados"} cm, braço{" "}
                {lastWA.armD !== null ? formatSigned(lastWA.armD) : "sem dados"} cm no fim do período.
              </p>
            )}
            <details className="evo-table">
              <summary>Ver dados em tabela</summary>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Cintura (7 dias)</th>
                    <th scope="col">Variação</th>
                    <th scope="col">Braço</th>
                    <th scope="col">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {view.waistArm.map((r) => (
                    <tr key={r.t}>
                      <th scope="row">{formatDate(new Date(r.t).toISOString().slice(0, 10))}</th>
                      <td>{r.waist !== null ? `${formatDecimal(r.waist)} cm` : "—"}</td>
                      <td>{r.waistD !== null ? formatSigned(r.waistD) : "—"}</td>
                      <td>{r.arm !== null ? `${formatDecimal(r.arm)} cm` : "—"}</td>
                      <td>{r.armD !== null ? formatSigned(r.armD) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        ) : (
          <EmptyChart canWiden={canWiden} />
        )}
      </Card>

      <div className="evo-pair">
        {/* Cintura diária */}
        <Card className="evo-card" spotlight={false}>
          <header className="evo-card__head">
            <div className="grid gap-1">
              <h2 className="text-xl">Cintura</h2>
              <p className="text-sm text-ice-300">Medições diárias e média de 7 dias. Os registos semanais antigos contam como medição única.</p>
            </div>
            <Legend
              items={[
                { label: "Média 7 dias", color: CHART.cobalt },
                { label: "Medição", color: CHART.dot, shape: "dot" },
              ]}
            />
          </header>
          {view.waistRows.length >= 2 ? (
            <DailyAverageChart
              rows={view.waistRows}
              goals={view.goals}
              domain={view.domain}
              unit="cm"
              pointLabel="Medição"
              label="Cintura: medições diárias e média de 7 dias."
            />
          ) : (
            <EmptyChart canWiden={canWiden} />
          )}
        </Card>

        {/* Peso */}
        <Card className="evo-card" spotlight={false}>
          <header className="evo-card__head">
            <div className="grid gap-1">
              <h2 className="text-xl">Peso</h2>
              <p className="text-sm text-ice-300">Pesagens diárias e média de 7 dias.</p>
            </div>
            <Legend
              items={[
                { label: "Média 7 dias", color: CHART.cobalt },
                { label: "Pesagem", color: CHART.dot, shape: "dot" },
              ]}
            />
          </header>
          {view.weightRows.length >= 2 ? (
            <DailyAverageChart
              rows={view.weightRows}
              goals={view.goals}
              domain={view.domain}
              unit="kg"
              pointLabel="Pesagem"
              label="Peso: pesagens diárias e média de 7 dias."
            />
          ) : (
            <EmptyChart canWiden={canWiden} />
          )}
        </Card>
      </div>

      {/* Proporção */}
      <Card className="evo-card" spotlight={false}>
        <header className="evo-card__head">
          <div className="grid gap-1">
            <h2 className="text-xl">Ombros / cintura</h2>
            <p className="text-sm text-ice-300">Ombros (último registo) a dividir pela média de 7 dias da cintura.</p>
          </div>
        </header>
        {view.ratios.length >= 2 ? (
          <RatioChart rows={view.ratios} domain={view.domain} ideal={SHOULDER_WAIST_IDEAL} />
        ) : (
          <EmptyChart canWiden={canWiden} />
        )}
      </Card>

      {view.goals.length > 0 && (
        <p className="text-sm text-ice-300">
          As linhas verticais marcam mudanças de metas:{" "}
          {view.goals.map((g, i) => (
            <span key={g.t}>
              {i > 0 && " · "}
              {g.label} ({formatDayMonth(new Date(g.t).toISOString().slice(0, 10))})
            </span>
          ))}
        </p>
      )}

      {/* Medidas semanais */}
      <section aria-labelledby="medidas-h" className="grid gap-4">
        <h2 id="medidas-h" className="text-xl">
          Medidas semanais
        </h2>
        <div className="evo-grid">
          {view.perMeasure.map(({ def, points }) => {
            const last = points.at(-1)!;
            const first = points[0];
            return (
              <Card key={def.key} className="evo-mini" spotlight={false}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base">{def.label.replace(/ \(.*\)$/, "")}</h3>
                  <p className="num text-sm">
                    <span className="font-semibold">
                      {formatDecimal(last.value)} {def.unit}
                    </span>
                    {points.length > 1 && <span className="text-ice-300"> · {formatSigned(last.value - first.value)}</span>}
                  </p>
                </div>
                {points.length >= 2 ? (
                  <MeasureChart id={def.key} label={def.label} unit={def.unit} points={points} domain={view.domain} />
                ) : (
                  <p className="py-6 text-sm text-ice-300">Só um registo neste período.</p>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <Comparator measurements={data.measurements} weights={data.weights} heightCm={data.heightCm} today={data.today} />
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string; shape?: "line" | "dot" }[] }) {
  return (
    <ul className="evo-legend">
      {items.map((i) => (
        <li key={i.label}>
          <span
            className={i.shape === "dot" ? "evo-legend__dot" : "evo-legend__line"}
            style={{ background: i.color }}
            aria-hidden="true"
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function EmptyChart({ canWiden }: { canWiden: boolean }) {
  return (
    <p className="grid min-h-40 place-items-center text-center text-sm text-ice-300">
      {canWiden ? "Precisa de pelo menos dois registos neste período. Experimenta “Tudo”." : "O gráfico aparece a partir do segundo registo."}
    </p>
  );
}
