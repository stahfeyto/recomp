import type { Point } from "@/lib/calculations";
import { formatDayMonth } from "@/lib/format";
import { formatDecimal } from "@/lib/number";

/**
 * Mini-gráfico SVG das últimas semanas. Revela-se da esquerda para a direita ao
 * entrar (clip-path), parado com "reduzir movimento".
 */
export function Sparkline({
  points,
  unit,
  label,
  id,
}: {
  points: Point[];
  unit: string;
  label: string;
  id: string;
}) {
  if (points.length < 2) {
    return <p className="text-sm text-ice-300">A tendência aparece a partir do segundo registo.</p>;
  }

  const W = 240;
  const H = 56;
  const pad = 4;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const t0 = new Date(`${points[0].date}T00:00:00Z`).getTime();
  const t1 = new Date(`${points[points.length - 1].date}T00:00:00Z`).getTime();
  const tSpan = t1 - t0 || 1;

  const xy = points.map((p) => {
    const x = pad + ((new Date(`${p.date}T00:00:00Z`).getTime() - t0) / tSpan) * (W - pad * 2);
    const y = pad + (1 - (p.value - min) / span) * (H - pad * 2);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as const;
  });
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0]} ${H} L${xy[0][0]} ${H} Z`;
  const [lx, ly] = xy[xy.length - 1];
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure className="sparkline">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label}: de ${formatDecimal(first.value)} ${unit} (${formatDayMonth(first.date)}) a ${formatDecimal(last.value)} ${unit} (${formatDayMonth(last.date)}).`}
      >
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--cobalt-400)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--cobalt-400)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#spark-${id})`} className="sparkline__area" />
        <path d={line} className="sparkline__line" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="sparkline__dot" style={{ left: `${(lx / W) * 100}%`, top: `${(ly / H) * 100}%` }} />
    </figure>
  );
}
