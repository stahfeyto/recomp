import { formatDayMonth } from "@/lib/format";

/**
 * Cores dos gráficos (validadas com o validador da skill dataviz, modo escuro,
 * superfície #0E1229): cobalto + limão escuro passam banda de luminosidade,
 * croma, separação para daltonismo (ΔE 34,9) e contraste. O acid #D7FF3A da
 * marca é claro demais para marcas de dados; fica para os destaques.
 */
export const CHART = {
  cobalt: "#4B63FF",
  lime: "#7C9E0C",
  grid: "rgba(220, 230, 255, 0.08)",
  axis: "#9FB3E8",
  surface: "#0E1229",
  annotation: "rgba(159, 179, 232, 0.45)",
  threshold: "#D7FF3A",
  dot: "rgba(159, 179, 232, 0.55)",
} as const;

export const axisTick = { fill: CHART.axis, fontSize: 12 } as const;

/** Rótulo do eixo do tempo: "8 nov." */
export function timeTick(t: number): string {
  return formatDayMonth(new Date(t).toISOString().slice(0, 10));
}

/** Margens comuns (espaço para o rótulo no fim das linhas). */
export const chartMargin = { top: 12, right: 16, bottom: 4, left: 0 } as const;
