import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { deltaTone } from "@/lib/calculations";
import { cn } from "@/lib/cn";
import { formatSigned } from "@/lib/format";
import type { MeasureKey } from "@/lib/measures";

/** Cartão KPI: valor grande com contagem, variação face à última medição e ao início. */
export function KpiCard({
  label,
  value,
  unit,
  decimals = 1,
  toneKey,
  previous,
  first,
  note,
  size = "md",
  className,
  children,
}: {
  label: string;
  value: number | null;
  unit: string;
  decimals?: number;
  /** Medida que define se subir/descer é bom. */
  toneKey: MeasureKey;
  previous?: number | null;
  first?: number | null;
  note?: ReactNode;
  size?: "md" | "lg";
  className?: string;
  children?: ReactNode;
}) {
  const deltas = [
    { label: "vs anterior", base: previous },
    { label: "desde o início", base: first },
  ].filter((d): d is { label: string; base: number } => typeof d.base === "number" && value !== null);

  return (
    <Card className={cn("kpi", size === "lg" && "kpi--lg", className)}>
      <p className="eyebrow">{label}</p>
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
          {deltas.map((d) => {
            const delta = (value as number) - d.base;
            return (
              <li key={d.label}>
                <DeltaBadge
                  tone={deltaTone(toneKey, delta)}
                  delta={delta}
                  label={`${formatSigned(delta)} ${unit}`}
                />
                <span className="text-xs text-ice-300">{d.label}</span>
              </li>
            );
          })}
        </ul>
      )}
      {note && <p className="kpi__note">{note}</p>}
      {children}
    </Card>
  );
}
