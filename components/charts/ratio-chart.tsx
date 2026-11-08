"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDecimal } from "@/lib/number";
import { ChartFrame } from "./chart-frame";
import { ChartTooltipBox } from "./chart-tooltip";
import { EndLabel } from "./end-label";
import { CHART, axisTick, chartMargin, timeTick } from "./theme";

export type RatioRow = { t: number; ratio: number };

type TP = { active?: boolean; label?: number; payload?: Array<{ payload: RatioRow }> };

const fmt2 = (v: number) => formatDecimal(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Evolução da proporção ombros/cintura, com a linha do ideal estético. */
export function RatioChart({
  rows,
  domain,
  ideal,
}: {
  rows: RatioRow[];
  domain: [number, number];
  ideal: number;
}) {
  const last = rows.length - 1;
  return (
    <ChartFrame height={220} label={`Proporção ombros/cintura ao longo do tempo; ideal ${fmt2(ideal)}.`}>
      {() => (
          <LineChart responsive style={{ width: "100%", height: "100%" }} data={rows} margin={{ ...chartMargin, right: 56 }}>
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
              domain={[(min: number) => Math.min(min - 0.05, 1.25), Math.max(ideal + 0.05, 1.65)]}
              tickFormatter={fmt2}
              tickCount={5}
            />
            <ReferenceLine
              y={ideal}
              stroke={CHART.threshold}
              strokeDasharray="4 4"
              label={{ value: `ideal ${fmt2(ideal)}`, position: "insideTopRight", fill: CHART.axis, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ stroke: "rgba(220,230,255,0.35)", strokeWidth: 1 }}
              content={(p) => {
                const { active, label, payload } = p as unknown as TP;
                if (!active || !payload?.length || label === undefined) return null;
                return (
                  <ChartTooltipBox
                    time={label}
                    rows={[{ key: "r", label: "Ombros / cintura", color: CHART.cobalt, value: fmt2(payload[0].payload.ratio) }]}
                  />
                );
              }}
            />
            <Line
              type="linear"
              dataKey="ratio"
              stroke={CHART.cobalt}
              strokeWidth={2}
              dot={rows.length <= 12 ? { r: 4, fill: CHART.cobalt, stroke: CHART.surface, strokeWidth: 2 } : false}
              activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2, fill: CHART.cobalt }}
              isAnimationActive={false}
              label={(props) => <EndLabel {...props} lastIndex={last} text={fmt2} />}
            />
          </LineChart>
      )}
    </ChartFrame>
  );
}
