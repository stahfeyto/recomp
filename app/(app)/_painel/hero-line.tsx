import type { CSSProperties } from "react";
import { formatDayMonth } from "@/lib/format";
import type { Point } from "@/lib/metrics";
import { formatDecimal } from "@/lib/number";

/**
 * Linha-herói do Painel: a média de 7 dias (violeta, com brilho, desenha-se ao
 * entrar), as medições diárias em pontos (entram em cascata), o ponto de hoje em
 * lima a pulsar e um varrimento de luz lento. Os pontos são HTML posicionados em
 * percentagem, por isso não deformam quando o SVG estica.
 */
export function HeroLine({
  average,
  daily,
  unit,
  label,
}: {
  average: Point[];
  daily: Point[];
  unit: string;
  label: string;
}) {
  if (average.length < 2) {
    return <p className="hero__empty">A linha aparece a partir do segundo dia com registo.</p>;
  }

  const W = 1000;
  const H = 300;
  const pad = 14;
  const all = [...average, ...daily];
  const values = all.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const t = (d: string) => new Date(`${d}T00:00:00Z`).getTime();
  const times = all.map((p) => t(p.date));
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const tSpan = t1 - t0 || 1;
  const X = (d: string) => pad + ((t(d) - t0) / tSpan) * (W - pad * 2);
  const Y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);

  const xy = average.map((p) => [X(p.date), Y(p.value)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)} ${H} L${xy[0][0].toFixed(1)} ${H} Z`;
  const [lx, ly] = xy[xy.length - 1];
  const first = average[0];
  const last = average[average.length - 1];
  const at = (x: number, y: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

  return (
    <figure
      className="heroline"
      role="img"
      aria-label={`${label}: de ${formatDecimal(first.value)} ${unit} (${formatDayMonth(first.date)}) a ${formatDecimal(last.value)} ${unit} (${formatDayMonth(last.date)}).`}
    >
      <span className="heroline__scale heroline__scale--max num">{formatDecimal(max)}</span>
      <span className="heroline__scale heroline__scale--min num">{formatDecimal(min)}</span>
      <span className="heroline__plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="heroline-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--violet-400)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--violet-400)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#heroline-area)" />
          <path d={line} className="heroline__glow" vectorEffect="non-scaling-stroke" />
          <path d={line} className="heroline__line" vectorEffect="non-scaling-stroke" />
        </svg>
        {daily.map((p, i) => (
          <i key={p.date} className="heroline__dot" style={{ ...at(X(p.date), Y(p.value)), "--i": i } as CSSProperties} />
        ))}
        <span className="heroline__now" style={at(lx, ly)} aria-hidden="true" />
        <span className="heroline__scan" aria-hidden="true" />
      </span>
      <span className="heroline__dates" aria-hidden="true">
        <span>{formatDayMonth(first.date)}</span>
        <span>{formatDayMonth(last.date)}</span>
      </span>
    </figure>
  );
}
