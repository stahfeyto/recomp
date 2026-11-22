import { formatDayMonth } from "@/lib/format";

/**
 * Cores dos gráficos (modo escuro, superfície ameixa #141022).
 * Violeta = série principal (média de 7 dias, medidas); lima = segunda série
 * (braço, no gráfico cintura vs braço) e limiares. Separam-se bem em luminosidade,
 * por isso continuam distintas para daltonismo.
 */
export const CHART = {
  violet: "#9B6BFF",
  lime: "#C6FF33",
  grid: "rgba(243, 240, 255, 0.08)",
  axis: "#B8B0D4",
  surface: "#141022",
  annotation: "rgba(184, 176, 212, 0.45)",
  threshold: "#C6FF33",
  dot: "rgba(184, 176, 212, 0.6)",
} as const;

export const axisTick = { fill: CHART.axis, fontSize: 12 } as const;

/** Rótulo do eixo do tempo: "8 nov." */
export function timeTick(t: number): string {
  return formatDayMonth(new Date(t).toISOString().slice(0, 10));
}

/** Margens comuns (espaço para o rótulo no fim das linhas). */
export const chartMargin = { top: 12, right: 16, bottom: 4, left: 0 } as const;
