import type { CSSProperties } from "react";
import { macroShares, type Macros } from "@/lib/macros";

const SEGMENTS = [
  { key: "proteinG", label: "Proteína", color: "var(--cobalt-400)" },
  { key: "carbsG", label: "Hidratos", color: "var(--acid-400)" },
  { key: "fatG", label: "Gordura", color: "var(--vermillion-500)" },
] as const;

const R = 52;
const C = 2 * Math.PI * R;
/** Intervalo entre segmentos (no comprimento do arco), da cor do fundo. */
const GAP = 3;

/** Donut da distribuição das calorias pelos macros; anima ao mudar. */
export function MacroDonut({ macros, calories }: { macros: Macros; calories: number }) {
  const shares = macroShares(macros);
  // Onde começa cada segmento (soma das fatias anteriores).
  const offsets = SEGMENTS.map((_, i) =>
    SEGMENTS.slice(0, i).reduce((sum, prev) => sum + shares[prev.key] * C, 0),
  );
  const label = SEGMENTS.map((s) => `${s.label} ${Math.round(shares[s.key] * 100)}%`).join(", ");

  return (
    <div className="donut" role="img" aria-label={`Distribuição das calorias: ${label}.`}>
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle cx="64" cy="64" r={R} className="donut__track" />
        {SEGMENTS.map((s, i) => {
          const len = Math.max(0, shares[s.key] * C - GAP);
          const style = {
            stroke: s.color,
            strokeDasharray: `${len} ${C - len}`,
            strokeDashoffset: -offsets[i],
            "--len": len,
          } as CSSProperties;
          return <circle key={s.key} cx="64" cy="64" r={R} className="donut__seg" style={style} transform="rotate(-90 64 64)" />;
        })}
      </svg>
      <div className="donut__center">
        <span className="num font-display text-3xl font-medium leading-none">{calories}</span>
        <span className="text-xs text-ice-300">kcal / dia</span>
      </div>
    </div>
  );
}
