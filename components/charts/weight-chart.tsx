"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDecimal } from "@/lib/number";
import { ChartFrame } from "./chart-frame";
import { ChartTooltipBox } from "./chart-tooltip";
import { EndLabel } from "./end-label";
import { CHART, axisTick, chartMargin, timeTick } from "./theme";
import type { GoalMark } from "./waist-arm-chart";

export type WeightRow = { t: number; weight: number | null; avg: number | null };

type TP = { active?: boolean; label?: number; payload?: Array<{ payload: WeightRow }> };

/** Pesagens diárias (pontos) + média móvel de 7 dias (linha). */
export function WeightChart({
  rows,
  goals,
  domain,
  hasDaily,
}: {
  rows: WeightRow[];
  goals: GoalMark[];
  domain: [number, number];
  /** Sem pesagens diárias, a linha mostra o peso das medições semanais. */
  hasDaily: boolean;
}) {
  const lastAvg = rows.findLastIndex((r) => r.avg !== null);
  const kg = (v: number) => `${formatDecimal(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;

  return (
    <ChartFrame height={260} label="Peso: pesagens diárias e média móvel de 7 dias.">
      {() => (
          <ComposedChart responsive style={{ width: "100%", height: "100%" }} data={rows} margin={{ ...chartMargin, right: 64 }}>
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
              domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]}
              tickFormatter={(v: number) => formatDecimal(v)}
            />
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
                      { key: "avg", label: hasDaily ? "Média de 7 dias" : "Peso", color: CHART.cobalt, value: r.avg !== null ? kg(r.avg) : null },
                      ...(hasDaily
                        ? [{ key: "w", label: "Pesagem", color: CHART.dot, value: r.weight !== null ? kg(r.weight) : null, key_shape: "dot" as const }]
                        : []),
                    ]}
                  />
                );
              }}
            />
            {hasDaily && (
              <Scatter
                dataKey="weight"
                name="Pesagem"
                isAnimationActive={false}
                shape={(props: { cx?: number; cy?: number }) =>
                  props.cx === undefined || props.cy === undefined ? <g /> : (
                    <circle cx={props.cx} cy={props.cy} r={3.5} fill={CHART.dot} stroke={CHART.surface} strokeWidth={2} />
                  )
                }
              />
            )}
            <Line
              type="monotone"
              dataKey="avg"
              name={hasDaily ? "Média de 7 dias" : "Peso"}
              stroke={CHART.cobalt}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2, fill: CHART.cobalt }}
              connectNulls
              isAnimationActive={false}
              label={(props) => <EndLabel {...props} lastIndex={lastAvg} text={kg} />}
            />
          </ComposedChart>
      )}
    </ChartFrame>
  );
}
