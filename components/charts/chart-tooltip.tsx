"use client";

import { formatDate } from "@/lib/format";

export type TooltipRow = {
  key: string;
  label: string;
  color: string;
  /** Texto do valor já formatado (ex.: "−1,2 cm"), ou null para esconder a linha. */
  value: string | null;
  /** Linha secundária (ex.: o valor absoluto). */
  detail?: string;
  /** "line" = traço curto; "dot" = ponto (pesagens soltas). */
  key_shape?: "line" | "dot";
};

/**
 * Conteúdo do tooltip: data em cima, depois uma linha por série com o valor em
 * destaque e o nome a seguir (o valor manda; a série identifica-se pelo traço).
 */
export function ChartTooltipBox({ time, rows }: { time: number; rows: TooltipRow[] }) {
  const visible = rows.filter((r) => r.value !== null);
  if (visible.length === 0) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__date">{formatDate(new Date(time).toISOString().slice(0, 10))}</p>
      <ul>
        {visible.map((r) => (
          <li key={r.key}>
            <span
              className={r.key_shape === "dot" ? "chart-tooltip__dot" : "chart-tooltip__line"}
              style={{ background: r.color }}
              aria-hidden="true"
            />
            <span className="chart-tooltip__value num">{r.value}</span>
            <span className="chart-tooltip__label">
              {r.label}
              {r.detail && <span className="chart-tooltip__detail"> · {r.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
