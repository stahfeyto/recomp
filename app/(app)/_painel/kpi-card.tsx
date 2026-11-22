import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { cn } from "@/lib/cn";
import { formatSigned } from "@/lib/format";
import type { Tone } from "@/lib/metrics";

export type KpiDelta = { label: string; delta: number; tone: Tone; unit: string };

/**
 * Cartão KPI: valor grande com contagem, etiqueta (ex.: "média de 7 dias",
 * "poucos dados") e variações já calculadas em lib/metrics.ts.
 */
export function KpiCard({
  label,
  value,
  unit,
  decimals = 1,
  badge,
  badgeTone = "neutral",
  deltas = [],
  note,
  size = "md",
  className,
  children,
}: {
  label: string;
  value: number | null;
  unit: string;
  decimals?: number;
  badge?: string;
  badgeTone?: "neutral" | "warn";
  deltas?: KpiDelta[];
  note?: ReactNode;
  size?: "md" | "lg";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card className={cn("kpi", size === "lg" && "kpi--lg", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        {badge && (
          <span className="kpi__badge" data-tone={badgeTone}>
            {badge}
          </span>
        )}
      </div>
      {value === null ? (
        <p className="text-ice-300">Sem registos ainda.</p>
      ) : (
        <p className="kpi__value">
          <CountUp value={value} decimals={decimals} className="num" />
          <span className="kpi__unit">{unit}</span>
        </p>
      )}
      {deltas.length > 0 && (
        <ul className="kpi__deltas">
          {deltas.map((d) => (
            <li key={d.label}>
              <DeltaBadge tone={d.tone} delta={d.delta} label={`${formatSigned(d.delta)} ${d.unit}`} />
              <span className="text-sm text-ice-300">{d.label}</span>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="kpi__note">{note}</p>}
      {children}
    </Card>
  );
}
