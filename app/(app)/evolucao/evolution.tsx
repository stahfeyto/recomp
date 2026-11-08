"use client";

import { useMemo, useState } from "react";
import { MeasureChart, type MeasurePoint } from "@/components/charts/measure-chart";
import { RatioChart, type RatioRow } from "@/components/charts/ratio-chart";
import { CHART } from "@/components/charts/theme";
import { WaistArmChart, type GoalMark, type WaistArmRow } from "@/components/charts/waist-arm-chart";
import { WeightChart, type WeightRow } from "@/components/charts/weight-chart";
import { Card } from "@/components/ui/card";
import {
  SHOULDER_WAIST_IDEAL,
  armAverage,
  isoToTime,
  lastKnownValues,
  movingAverage7,
  periodStart,
  ratio,
  round1,
  shiftISODate,
} from "@/lib/calculations";
import type { EvolutionData } from "@/lib/data/evolution";
import { formatDate, formatDayMonth, formatSigned } from "@/lib/format";
import { MEASURES } from "@/lib/measures";
import { formatDecimal } from "@/lib/number";
import { Comparator } from "./comparator";

const PERIODS = [
  { id: "4s", label: "4 semanas", days: 28 },
  { id: "3m", label: "3 meses", days: 91 },
  { id: "6m", label: "6 meses", days: 182 },
  { id: "all", label: "Tudo", days: null },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

export function Evolution({ data }: { data: EvolutionData }) {
  const [period, setPeriod] = useState<PeriodId>("3m");
  const days = PERIODS.find((p) => p.id === period)!.days;

  const view = useMemo(() => {
    const from = periodStart(data.today, days);
    const inRange = (d: string) => !from || d >= from;
    const ms = data.measurements.filter((m) => inRange(m.date));
    const allDates = [
      ...ms.map((m) => m.date),
      ...data.weights.filter((w) => inRange(w.date)).map((w) => w.date),
    ].sort();
    const start = from ?? allDates[0] ?? data.today;
    const domain: [number, number] = [isoToTime(start), isoToTime(data.today)];

    // Cintura vs braço: variação desde o primeiro valor do período
    const waistBase = ms.find((m) => typeof m.waistCm === "number")?.waistCm ?? null;
    const armBase = ms.map(armAverage).find((v) => v !== null) ?? null;
    // Último valor conhecido de cada série, para o tooltip mostrar sempre as duas.
    const waistArm: WaistArmRow[] = [];
    {
      let lastWaist: WaistArmRow["waistLast"] = null;
      let lastArm: WaistArmRow["armLast"] = null;
      for (const m of ms) {
        const arm = armAverage(m);
        const waistD = m.waistCm !== null && waistBase !== null ? round1(m.waistCm - waistBase) : null;
        const armD = arm !== null && armBase !== null ? round1(arm - armBase) : null;
        if (waistD !== null || armD !== null) {
          waistArm.push({
            t: isoToTime(m.date),
            waist: m.waistCm,
            arm,
            waistD,
            armD,
            waistLast: lastWaist,
            armLast: lastArm,
          });
        }
        if (waistD !== null) lastWaist = { d: waistD, value: m.waistCm!, date: m.date };
        if (armD !== null) lastArm = { d: armD, value: arm!, date: m.date };
      }
    }

    // Peso
    const dailyInRange = data.weights.filter((w) => inRange(w.date));
    const hasDaily = dailyInRange.length > 0;
    const weight: WeightRow[] = hasDaily
      ? (() => {
          // A média usa também pesagens logo antes do período.
          const ma = movingAverage7(data.weights.filter((w) => w.date >= shiftISODate(start, -6)));
          const maByDate = new Map(ma.map((x) => [x.date, x.average]));
          return dailyInRange.map((w) => ({ t: isoToTime(w.date), weight: w.weightKg, avg: maByDate.get(w.date) ?? null }));
        })()
      : ms
          .filter((m) => typeof m.weightKg === "number")
          .map((m) => ({ t: isoToTime(m.date), weight: null, avg: m.weightKg }));

    // Proporção ombros/cintura com os últimos valores conhecidos a cada data
    const ratios: RatioRow[] = ms
      .map((m) => {
        const known = lastKnownValues(data.measurements, { beforeDate: shiftISODate(m.date, 1) });
        const s = known.shouldersCm?.value;
        const w = known.waistCm?.value;
        return s && w ? { t: isoToTime(m.date), ratio: ratio(s, w) } : null;
      })
      .filter((r): r is RatioRow => r !== null);

    // Uma série por medida
    const perMeasure = MEASURES.map((def) => ({
      def,
      points: ms
        .filter((m) => typeof m[def.key] === "number")
        .map((m) => ({ t: isoToTime(m.date), value: m[def.key] as number })) as MeasurePoint[],
    })).filter((s) => s.points.length > 0);

    const goals: GoalMark[] = data.goals
      .filter((g) => inRange(g.date) && g.date <= data.today)
      .map((g) => ({ t: isoToTime(g.date), label: g.label }));

    return { domain, waistArm, weight, hasDaily, ratios, perMeasure, goals, start };
  }, [data, days]);

  const lastWA = view.waistArm.at(-1);

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
              {formatDate(view.waistArm[0] ? new Date(view.waistArm[0].t).toISOString().slice(0, 10) : view.start)}. A
              cintura decide: deve descer enquanto o braço sobe ou fica.
            </p>
          </div>
          <Legend
            items={[
              { label: "Cintura", color: CHART.cobalt },
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
                    <th scope="col">Cintura</th>
                    <th scope="col">Variação</th>
                    <th scope="col">Braço (média)</th>
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
          <EmptyChart canWiden={data.measurements.length >= 2 && period !== "all"} />
        )}
      </Card>

      <div className="evo-pair">
        {/* Peso */}
        <Card className="evo-card" spotlight={false}>
          <header className="evo-card__head">
            <div className="grid gap-1">
              <h2 className="text-xl">Peso</h2>
              <p className="text-sm text-ice-300">
                {view.hasDaily ? "Pesagens diárias e média móvel de 7 dias." : "Peso das medições semanais."}
              </p>
            </div>
            {view.hasDaily && (
              <Legend
                items={[
                  { label: "Média 7 dias", color: CHART.cobalt },
                  { label: "Pesagem", color: CHART.dot, shape: "dot" },
                ]}
              />
            )}
          </header>
          {view.weight.length >= 2 ? (
            <WeightChart rows={view.weight} goals={view.goals} domain={view.domain} hasDaily={view.hasDaily} />
          ) : (
            <EmptyChart canWiden={data.measurements.length >= 2 && period !== "all"} />
          )}
        </Card>

        {/* Proporção */}
        <Card className="evo-card" spotlight={false}>
          <header className="evo-card__head">
            <div className="grid gap-1">
              <h2 className="text-xl">Ombros / cintura</h2>
              <p className="text-sm text-ice-300">Sobe quando a cintura desce ou os ombros crescem.</p>
            </div>
          </header>
          {view.ratios.length >= 2 ? (
            <RatioChart rows={view.ratios} domain={view.domain} ideal={SHOULDER_WAIST_IDEAL} />
          ) : (
            <EmptyChart canWiden={data.measurements.length >= 2 && period !== "all"} />
          )}
        </Card>
      </div>

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

      {/* Cada medida */}
      <section aria-labelledby="medidas-h" className="grid gap-4">
        <h2 id="medidas-h" className="text-xl">
          Cada medida
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
                    <span className="font-semibold">{formatDecimal(last.value)} {def.unit}</span>
                    {points.length > 1 && (
                      <span className="text-ice-300"> · {formatSigned(last.value - first.value)}</span>
                    )}
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

      <Comparator measurements={data.measurements} heightCm={data.heightCm} />
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
      {canWiden
        ? "Precisa de pelo menos dois registos neste período. Experimenta “Tudo”."
        : "O gráfico aparece a partir do segundo registo."}
    </p>
  );
}
