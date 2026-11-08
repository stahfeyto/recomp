"use client";

import { animate } from "motion/react";
import { useEffect, useRef } from "react";

function make(decimals: number, fixed: boolean) {
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: fixed ? decimals : 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Número que conta de 0 até ao valor ao aparecer (uma vez). O HTML do servidor
 * já traz o valor final; com "reduzir movimento" fica parado nele.
 */
export function CountUp({
  value,
  decimals = 1,
  duration = 1.1,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = make(decimals, false).format(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const during = make(decimals, true);
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = during.format(v);
      },
      onComplete: () => {
        el.textContent = make(decimals, false).format(value);
      },
    });
    return () => controls.stop();
  }, [value, decimals, duration]);

  return (
    <span ref={ref} className={className ?? "num"}>
      {final}
    </span>
  );
}
