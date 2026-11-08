"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDecimal } from "@/lib/number";
import { ChartFrame } from "./chart-frame";
import { ChartTooltipBox } from "./chart-tooltip";
import { CHART, axisTick, timeTick } from "./theme";

export type MeasurePoint = { t: number; value: number };

type TP = { active?: boolean; label?: number; payload?: Array<{ payload: MeasurePoint }> };

/** Gráfico pequeno de uma medida: linha + área em gradiente suave (cobalto). */
export function MeasureChart({
  id,
  label,
  unit,
  points,
  domain,
}: {
  id: string;
  label: string;
  unit: string;
  points: MeasurePoint[];
  domain: [number, number];
}) {
  return (
    <ChartFrame height={150} label={`${label} ao longo do tempo.`}>
      {(animate) => (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`m-${id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={CHART.cobalt} stopOpacity={0.22} />
                <stop offset="100%" stopColor={CHART.cobalt} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={domain}
              tickFormatter={timeTick}
              tick={{ ...axisTick, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
              minTickGap={32}
            />
            <YAxis
              width={36}
              tick={{ ...axisTick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]}
              tickCount={3}
              tickFormatter={(v: number) => formatDecimal(v)}
            />
            <Tooltip
              cursor={{ stroke: "rgba(220,230,255,0.35)", strokeWidth: 1 }}
              content={(p) => {
                const { active, label: t, payload } = p as unknown as TP;
                if (!active || !payload?.length || t === undefined) return null;
                return (
                  <ChartTooltipBox
                    time={t}
                    rows={[{ key: id, label, color: CHART.cobalt, value: `${formatDecimal(payload[0].payload.value)} ${unit}` }]}
                  />
                );
              }}
            />
            <Area
              type="linear"
              dataKey="value"
              stroke={CHART.cobalt}
              strokeWidth={2}
              fill={`url(#m-${id})`}
              dot={points.length <= 10 ? { r: 3, fill: CHART.cobalt, stroke: CHART.surface, strokeWidth: 2 } : false}
              activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2, fill: CHART.cobalt }}
              isAnimationActive={animate}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}
