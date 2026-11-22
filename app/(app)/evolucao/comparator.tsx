"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui/card";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { SHOULDER_WAIST_IDEAL, WAIST_HEIGHT_HEALTHY } from "@/lib/calculations";
import type { EvolutionMeasurement } from "@/lib/data/evolution";
import { formatDate, formatDayMonth, formatSigned } from "@/lib/format";
import { MEASURES } from "@/lib/measures";
import {
  RELIABILITY_LABEL,
  comparePoints,
  compareWindows,
  lastAt,
  ratio,
  seriesOf,
  toneOf,
  weightSeries,
  windowStat,
  type WindowStat,
} from "@/lib/metrics";
import { formatDecimal } from "@/lib/number";

const fmt2 = (n: number) => formatDecimal(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt1 = (n: number) => formatDecimal(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Comparador "Antes / Agora". Peso e cintura: média de 7 dias até cada data (o peso
 * vem das pesagens diárias). Braço, peito, ombros, extras: último registo até essa
 * data (e diz de quando é). Todos os cálculos vêm de lib/metrics.ts.
 */
export function Comparator({
  measurements,
  weights,
  heightCm,
  today,
}: {
  measurements: EvolutionMeasurement[];
  weights: Array<{ date: string; weightKg: number }>;
  heightCm: number | null;
  today: string;
}) {
  const weightPts = weightSeries(weights, measurements);
  const waistPts = seriesOf(measurements, (r) => r.waistCm);
  const dates = [...new Set([...measurements.map((m) => m.date), ...weightPts.map((p) => p.date)])]
    .filter((d) => d <= today)
    .sort();
  const [before, setBefore] = useState(dates[0] ?? "");
  const [after, setAfter] = useState(dates.at(-1) ?? "");
  const idA = useId();
  const idB = useId();

  if (dates.length < 2) {
    return (
      <Card className="evo-card" spotlight={false}>
        <h2 className="text-xl">Antes / Agora</h2>
        <p className="text-sm text-ice-300">Precisa de pelo menos dois registos.</p>
      </Card>
    );
  }

  const avgRow = (label: string, key: "weightKg" | "waistCm", unit: "kg" | "cm", pts: typeof weightPts) => {
    const a = windowStat(pts, before);
    const b = windowStat(pts, after);
    const c = a && b ? compareWindows(b, a, unit) : null;
    return { label, key, unit, a, b, c };
  };
  const averaged = [avgRow("Peso", "weightKg", "kg", weightPts), avgRow("Cintura", "waistCm", "cm", waistPts)];

  const slow = MEASURES.filter((m) => m.key !== "weightKg" && m.key !== "waistCm")
    .map((m) => {
      const pts = seriesOf(measurements, (r) => r[m.key]);
      const a = lastAt(pts, before);
      const b = lastAt(pts, after);
      return { m, a, b, c: a && b ? comparePoints(b, a) : null };
    })
    .filter((r) => r.a || r.b);

  const ratioAt = (d: string) => {
    const s = lastAt(seriesOf(measurements, (r) => r.shouldersCm), d);
    const w = windowStat(waistPts, d);
    return s && w ? ratio(s.value, w.value) : null;
  };
  const whrAt = (d: string) => {
    const w = windowStat(waistPts, d);
    return w && heightCm ? ratio(w.value, heightCm) : null;
  };

  return (
    <Card className="evo-card" spotlight={false}>
      <header className="evo-card__head">
        <div className="grid gap-1">
          <h2 className="text-xl">Antes / Agora</h2>
          <p className="text-sm text-ice-300">Peso e cintura em média de 7 dias até cada data; o resto é o último registo.</p>
        </div>
      </header>

      <div className="comparator__pickers">
        <div className="field">
          <label htmlFor={idA} className="field__label">
            Antes
          </label>
          <select id={idA} className="input" value={before} onChange={(e) => setBefore(e.target.value)}>
            {dates.map((d) => (
              <option key={d} value={d}>
                {formatDate(d)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={idB} className="field__label">
            Agora
          </label>
          <select id={idB} className="input" value={after} onChange={(e) => setAfter(e.target.value)}>
            {dates.map((d) => (
              <option key={d} value={d}>
                {formatDate(d)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="comparator__wrap">
        <table className="comparator">
          <thead>
            <tr>
              <th scope="col">Medida</th>
              <th scope="col">{formatDayMonth(before)}</th>
              <th scope="col">{formatDayMonth(after)}</th>
              <th scope="col">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {averaged.map((r) => (
              <tr key={r.key}>
                <th scope="row">{r.label}</th>
                <AvgCell w={r.a} unit={r.unit} />
                <AvgCell w={r.b} unit={r.unit} />
                <td>
                  {r.c ? (
                    <DeltaBadge
                      tone={r.key === "weightKg" ? "neutral" : toneOf(r.key, r.c.trend)}
                      delta={r.c.delta}
                      label={`${formatSigned(r.c.delta)} ${r.unit}${r.c.trend === "same" ? " · igual" : ""}`}
                    />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {slow.map(({ m, a, b, c }) => (
              <tr key={m.key}>
                <th scope="row">{m.label}</th>
                <PointCell p={a} date={before} unit={m.unit} />
                <PointCell p={b} date={after} unit={m.unit} />
                <td>
                  {c ? (
                    <DeltaBadge
                      tone={toneOf(m.key, c.trend)}
                      delta={c.delta}
                      label={`${formatSigned(c.delta)} ${m.unit}${c.trend === "same" ? " · igual" : ""}`}
                    />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            <RatioRow label={`Ombros / cintura (ideal ${fmt2(SHOULDER_WAIST_IDEAL)})`} a={ratioAt(before)} b={ratioAt(after)} better="up" />
            <RatioRow label={`Cintura / altura (< ${fmt2(WAIST_HEIGHT_HEALTHY)})`} a={whrAt(before)} b={whrAt(after)} better="down" />
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AvgCell({ w, unit }: { w: WindowStat | null; unit: string }) {
  if (!w) return <td>—</td>;
  return (
    <td>
      <span className="num">
        {fmt1(w.value)} {unit}
      </span>
      <span className="comparator__from">
        {w.reliability === "fiavel" ? `média de ${w.count}` : RELIABILITY_LABEL[w.reliability]}
      </span>
    </td>
  );
}

function PointCell({ p, date, unit }: { p: { value: number; date: string } | null; date: string; unit: string }) {
  if (!p) return <td>—</td>;
  return (
    <td>
      <span className="num">
        {formatDecimal(p.value)} {unit}
      </span>
      {p.date !== date && <span className="comparator__from">de {formatDayMonth(p.date)}</span>}
    </td>
  );
}

function RatioRow({ label, a, b, better }: { label: string; a: number | null; b: number | null; better: "up" | "down" }) {
  const delta = a !== null && b !== null ? Math.round((b - a) * 100) / 100 : null;
  const tone = delta === null || delta === 0 ? "neutral" : delta > 0 === (better === "up") ? "good" : "bad";
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="num">{a !== null ? fmt2(a) : "—"}</td>
      <td className="num">{b !== null ? fmt2(b) : "—"}</td>
      <td>
        {delta !== null ? (
          <DeltaBadge tone={tone} delta={delta} label={`${delta > 0 ? "+" : delta < 0 ? "−" : ""}${fmt2(Math.abs(delta))}`} />
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
