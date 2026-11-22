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

/** Um dia: o valor medido (ponto) e a média de 7 dias nesse dia (linha). */
export type DailyAverageRow = {
  t: number;
  value: number;
  avg: number;
  /** Medições na janela de 7 dias desse ponto (1 = medição única). */
  count: number;
};

type TP = { active?: boolean; label?: number; payload?: Array<{ payload: DailyAverageRow }> };

/**
 * Medição diária (pontos) + média de 7 dias (linha): usado no peso e na cintura.
 * Os dados antigos (uma medição por semana) aparecem como pontos com a média igual
 * ao próprio valor ("medição única").
 */
export function DailyAverageChart({
  rows,
  goals,
  domain,
  unit,
  pointLabel,
  height = 260,
  label,
}: {
  rows: DailyAverageRow[];
  goals: GoalMark[];
  domain: [number, number];
  unit: "kg" | "cm";
  /** Nome do ponto no tooltip, ex.: "Pesagem", "Medição". */
  pointLabel: string;
  height?: number;
  /** Descrição para leitores de ecrã. */
  label: string;
}) {
  const last = rows.length - 1;
  const fmt = (v: number) => `${formatDecimal(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unit}`;

  return (
    <ChartFrame height={height} label={label}>
      {() => (
        <ComposedChart responsive style={{ width: "100%", height: "100%" }} data={rows} margin={{ ...chartMargin, right: 72 }}>
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
              const { active, label: t, payload } = p as unknown as TP;
              if (!active || !payload?.length || t === undefined) return null;
              const r = payload[0].payload;
              return (
                <ChartTooltipBox
                  time={t}
                  rows={[
                    {
                      key: "avg",
                      label: r.count >= 4 ? "Média de 7 dias" : r.count === 1 ? "Medição única" : `Média (${r.count} medições)`,
                      color: CHART.cobalt,
                      value: fmt(r.avg),
                    },
                    { key: "v", label: pointLabel, color: CHART.dot, value: fmt(r.value), key_shape: "dot" as const },
                  ]}
                />
              );
            }}
          />
          <Scatter
            dataKey="value"
            name={pointLabel}
            isAnimationActive={false}
            shape={(props: { cx?: number; cy?: number }) =>
              props.cx === undefined || props.cy === undefined ? (
                <g />
              ) : (
                <circle cx={props.cx} cy={props.cy} r={4} fill={CHART.dot} stroke={CHART.surface} strokeWidth={2} />
              )
            }
          />
          <Line
            type="monotone"
            dataKey="avg"
            name="Média de 7 dias"
            stroke={CHART.cobalt}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2, fill: CHART.cobalt }}
            isAnimationActive={false}
            label={(props) => <EndLabel {...props} lastIndex={last} text={fmt} />}
          />
        </ComposedChart>
      )}
    </ChartFrame>
  );
}
