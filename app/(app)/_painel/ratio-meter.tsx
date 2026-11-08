import type { CSSProperties } from "react";
import { formatDecimal } from "@/lib/number";

const fmt2 = (n: number) => formatDecimal(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Barra de um rácio numa escala [min, max] com uma marca (objetivo ou limite).
 * `goodBelow`: a zona boa fica à esquerda da marca (cintura/altura); senão a barra
 * enche até ao valor, a caminho da marca (ombros/cintura).
 */
export function RatioMeter({
  value,
  min,
  max,
  mark,
  markLabel,
  goodBelow = false,
}: {
  value: number;
  min: number;
  max: number;
  mark: number;
  markLabel: string;
  goodBelow?: boolean;
}) {
  const pos = (n: number) => Math.min(100, Math.max(0, ((n - min) / (max - min)) * 100));
  const v = pos(value);
  const m = pos(mark);

  return (
    <div
      className={goodBelow ? "ratio-meter ratio-meter--zone" : "ratio-meter"}
      style={{ "--v": `${v}%`, "--m": `${m}%` } as CSSProperties}
      role="img"
      aria-label={`${fmt2(value)} numa escala de ${fmt2(min)} a ${fmt2(max)}; ${markLabel} ${fmt2(mark)}.`}
    >
      <div className="ratio-meter__track">
        {!goodBelow && <span className="ratio-meter__fill" />}
        <span className="ratio-meter__mark" />
        <span className="ratio-meter__pointer" />
      </div>
      <div className="ratio-meter__scale" aria-hidden="true">
        <span>{fmt2(min)}</span>
        <span className="ratio-meter__mark-label">
          {markLabel} {fmt2(mark)}
        </span>
        <span>{fmt2(max)}</span>
      </div>
    </div>
  );
}
