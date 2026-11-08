"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui/card";
import { DeltaBadge } from "@/components/ui/delta-badge";
import {
  deltaTone,
  lastKnownValues,
  ratio,
  shiftISODate,
  SHOULDER_WAIST_IDEAL,
  WAIST_HEIGHT_HEALTHY,
} from "@/lib/calculations";
import type { EvolutionMeasurement } from "@/lib/data/evolution";
import { formatDate, formatDayMonth, formatSigned } from "@/lib/format";
import { MEASURES, type MeasureKey } from "@/lib/measures";
import { formatDecimal } from "@/lib/number";

const fmt2 = (n: number) => formatDecimal(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Comparador "Antes / Agora": duas datas lado a lado, todas as medidas e a diferença.
 * Para cada data usa o último valor conhecido até esse dia (e diz de quando é).
 */
export function Comparator({
  measurements,
  heightCm,
}: {
  measurements: EvolutionMeasurement[];
  heightCm: number | null;
}) {
  const dates = [...new Set(measurements.map((m) => m.date))].sort();
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

  const at = (d: string) => lastKnownValues(measurements, { beforeDate: shiftISODate(d, 1) });
  const A = at(before);
  const B = at(after);

  const rows = MEASURES.filter((m) => A[m.key] || B[m.key]).map((m) => ({
    key: m.key,
    label: m.label,
    unit: m.unit,
    a: A[m.key],
    b: B[m.key],
  }));

  const ratioAt = (v: typeof A) =>
    v.shouldersCm && v.waistCm ? ratio(v.shouldersCm.value, v.waistCm.value) : null;
  const whrAt = (v: typeof A) => (v.waistCm && heightCm ? ratio(v.waistCm.value, heightCm) : null);

  return (
    <Card className="evo-card" spotlight={false}>
      <header className="evo-card__head">
        <div className="grid gap-1">
          <h2 className="text-xl">Antes / Agora</h2>
          <p className="text-sm text-ice-300">Escolhe duas datas de registo.</p>
        </div>
      </header>

      <div className="comparator__pickers">
        <div className="field">
          <label htmlFor={idA} className="field__label">Antes</label>
          <select id={idA} className="input" value={before} onChange={(e) => setBefore(e.target.value)}>
            {dates.map((d) => (
              <option key={d} value={d}>{formatDate(d)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={idB} className="field__label">Agora</label>
          <select id={idB} className="input" value={after} onChange={(e) => setAfter(e.target.value)}>
            {dates.map((d) => (
              <option key={d} value={d}>{formatDate(d)}</option>
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
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">{r.label}</th>
                <Cell v={r.a} date={before} unit={r.unit} />
                <Cell v={r.b} date={after} unit={r.unit} />
                <td>
                  {r.a && r.b ? (
                    <DeltaBadge
                      tone={deltaTone(r.key as MeasureKey, r.b.value - r.a.value)}
                      delta={r.b.value - r.a.value}
                      label={`${formatSigned(r.b.value - r.a.value)} ${r.unit}`}
                    />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            <RatioRow label={`Ombros / cintura (ideal ${fmt2(SHOULDER_WAIST_IDEAL)})`} a={ratioAt(A)} b={ratioAt(B)} better="up" />
            <RatioRow label={`Cintura / altura (< ${fmt2(WAIST_HEIGHT_HEALTHY)})`} a={whrAt(A)} b={whrAt(B)} better="down" />
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Cell({ v, date, unit }: { v?: { value: number; date: string }; date: string; unit: string }) {
  if (!v) return <td>—</td>;
  return (
    <td>
      <span className="num">{formatDecimal(v.value)} {unit}</span>
      {v.date !== date && <span className="comparator__from">de {formatDayMonth(v.date)}</span>}
    </td>
  );
}

function RatioRow({ label, a, b, better }: { label: string; a: number | null; b: number | null; better: "up" | "down" }) {
  const delta = a !== null && b !== null ? Math.round((b - a) * 100) / 100 : null;
  const tone =
    delta === null || delta === 0 ? "neutral" : (delta > 0) === (better === "up") ? "good" : "bad";
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
