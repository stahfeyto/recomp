"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Reserva a altura do gráfico e só o monta quando entra no ecrã, para a linha se
 * desenhar à vista (uma vez). Com "reduzir movimento" monta logo, sem animação.
 *
 * Até a hidratação acabar mostra sempre o espaço reservado (igual ao HTML do
 * servidor): decidir antes disso com base em "reduzir movimento" dava um erro de
 * hidratação a quem tem essa opção ligada.
 */
export function ChartFrame({
  height,
  label,
  children,
}: {
  height: number;
  /** Descrição curta para leitores de ecrã. */
  label: string;
  children: (animate: boolean) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  const show = hydrated && (inView || reduced === true);

  return (
    <div ref={ref} className="chart-frame" style={{ height }} role="figure" aria-label={label}>
      {show ? children(reduced !== true) : <div className="chart-frame__placeholder" aria-hidden="true" />}
    </div>
  );
}
