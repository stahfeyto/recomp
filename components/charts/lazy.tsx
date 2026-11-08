"use client";

import dynamic from "next/dynamic";

/**
 * Gráficos carregados à parte (o Recharts fica fora do código inicial da página):
 * a página fica interativa mais cedo e os gráficos chegam logo a seguir. Enquanto
 * carregam, ocupam a mesma altura (sem saltos de layout).
 */
function placeholder(height: number) {
  function ChartLoading() {
    return <div className="chart-frame__placeholder" style={{ height }} aria-hidden="true" />;
  }
  return ChartLoading;
}

export const WaistArmChart = dynamic(
  () => import("./waist-arm-chart").then((m) => m.WaistArmChart),
  { ssr: false, loading: placeholder(320) },
);

export const WeightChart = dynamic(
  () => import("./weight-chart").then((m) => m.WeightChart),
  { ssr: false, loading: placeholder(260) },
);

export const RatioChart = dynamic(
  () => import("./ratio-chart").then((m) => m.RatioChart),
  { ssr: false, loading: placeholder(220) },
);

export const MeasureChart = dynamic(
  () => import("./measure-chart").then((m) => m.MeasureChart),
  { ssr: false, loading: placeholder(150) },
);
