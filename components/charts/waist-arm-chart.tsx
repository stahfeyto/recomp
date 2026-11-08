"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDayMonth, formatSigned } from "@/lib/format";
import { formatDecimal } from "@/lib/number";
import { ChartFrame } from "./chart-frame";
import { ChartTooltipBox, type TooltipRow } from "./chart-tooltip";
import { EndLabel } from "./end-label";
import { CHART, axisTick, chartMargin, timeTick } from "./theme";

export type WaistArmRow = {
  t: number;
  waist: number | null;
  arm: number | null;
  waistD: number | null;
  armD: number | null;
  /** Último braço conhecido até esta data (para o tooltip mostrar sempre as duas séries). */
  armLast?: { d: number; value: number; date: string } | null;
  waistLast?: { d: number; value: number; date: string } | null;
};

/** Marcas do eixo de 0,5 em 0,5 cm, a incluir sempre o zero. */
function halfTicks(rows: WaistArmRow[]): number[] {
  const vals = rows.flatMap((r) => [r.waistD, r.armD]).filter((v): v is number => v !== null);
  const lo = Math.min(-0.5, Math.floor(Math.min(...vals) * 2) / 2);
  const hi = Math.max(0.5, Math.ceil(Math.max(...vals) * 2) / 2);
  const step = hi - lo > 4 ? 1 : 0.5;
  const out: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 10) / 10);
  return out;
}

export type GoalMark = { t: number; label: string };

type TP = { active?: boolean; label?: number; payload?: Array<{ payload: WaistArmRow }> };

/**
 * Linha do tooltip de uma série: o valor desse dia ou, se nesse dia não foi medida,
 * o último valor conhecido com a data ("de 11 out.").
 */
function seriesRow(
  key: string,
  label: string,
  color: string,
  delta: number | null,
  value: number | null,
  last: WaistArmRow["armLast"],
  fmt: (v: number) => string,
): TooltipRow {
  if (delta !== null && value !== null) {
    return { key, label, color, value: fmt(delta), detail: `${formatDecimal(value)} cm` };
  }
  if (last) {
    return { key, label, color, value: fmt(last.d), detail: `${formatDecimal(last.value)} cm, de ${formatDayMonth(last.date)}` };
  }
  return { key, label, color, value: null };
}

/**
 * O gráfico mais importante da recomposição: cintura e braço como variação (cm)
 * desde o primeiro registo do período, num só eixo. Cintura a descer e braço a
 * subir leem-se diretamente, sem duas escalas arbitrárias.
 */
export function WaistArmChart({
  rows,
  goals,
  domain,
}: {
  rows: WaistArmRow[];
  goals: GoalMark[];
  domain: [number, number];
}) {
  const lastWaist = rows.findLastIndex((r) => r.waistD !== null);
  const lastArm = rows.findLastIndex((r) => r.armD !== null);
  const fmt = (v: number) => `${formatSigned(v)} cm`;
  const ticks = halfTicks(rows);

  return (
    <ChartFrame height={320} label="Variação da cintura e do braço desde o início do período, em centímetros.">
      {(animate) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ ...chartMargin, right: 64 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={domain}
              tickFormatter={timeTick}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
              minTickGap={24}
            />
            <YAxis
              width={44}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatSigned(v)}
              domain={[ticks[0], ticks[ticks.length - 1]]}
              ticks={ticks}
            />
            <ReferenceLine y={0} stroke="rgba(220,230,255,0.22)" />
            {goals.map((g) => (
              <ReferenceLine
                key={g.t}
                x={g.t}
                stroke={CHART.annotation}
                label={{ value: g.label, position: "insideTopLeft", fill: CHART.axis, fontSize: 11, className: "chart-goal-label" }}
              />
            ))}
            <Tooltip
              cursor={{ stroke: "rgba(220,230,255,0.35)", strokeWidth: 1 }}
              content={(p) => {
                const { active, label, payload } = p as unknown as TP;
                if (!active || !payload?.length || label === undefined) return null;
                const r = payload[0].payload;
                return (
                  <ChartTooltipBox
                    time={label}
                    rows={[
                      seriesRow("w", "Cintura", CHART.cobalt, r.waistD, r.waist, r.waistLast, fmt),
                      seriesRow("a", "Braço (média)", CHART.lime, r.armD, r.arm, r.armLast, fmt),
                    ]}
                  />
                );
              }}
            />
            <Line
              type="linear"
              dataKey="waistD"
              name="Cintura"
              stroke={CHART.cobalt}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2, fill: CHART.cobalt }}
              connectNulls
              isAnimationActive={animate}
              animationDuration={1200}
              label={(props) => <EndLabel {...props} lastIndex={lastWaist} text={(v) => fmt(v)} />}
            />
            <Line
              type="linear"
              dataKey="armD"
              name="Braço"
              stroke={CHART.lime}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2, fill: CHART.lime }}
              connectNulls
              isAnimationActive={animate}
              animationDuration={1200}
              animationBegin={150}
              label={(props) => <EndLabel {...props} lastIndex={lastArm} text={(v) => fmt(v)} />}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}
