import type { CSSProperties } from "react";
import { CountUp } from "@/components/ui/count-up";
import { formatDecimal } from "@/lib/number";

type Goal = { label: string; calories: number; proteinG: number; carbsG: number; fatG: number };

/**
 * Anéis concêntricos (estilo Apple Watch): cada anel enche até à fatia das
 * calorias da meta que vem desse macro. Proteína = cobalto, hidratos = acid,
 * gordura = vermillion.
 */
export function MacroRings({ goal, weightKg }: { goal: Goal; weightKg: number | null }) {
  const kcal = {
    protein: goal.proteinG * 4,
    carbs: goal.carbsG * 4,
    fat: goal.fatG * 9,
  };
  const total = kcal.protein + kcal.carbs + kcal.fat;
  const rings = [
    { key: "protein", label: "Proteína", grams: goal.proteinG, share: kcal.protein / total, r: 52, color: "var(--cobalt-400)" },
    { key: "carbs", label: "Hidratos", grams: goal.carbsG, share: kcal.carbs / total, r: 40, color: "var(--acid-400)" },
    { key: "fat", label: "Gordura", grams: goal.fatG, share: kcal.fat / total, r: 28, color: "var(--vermillion-500)" },
  ];
  const pct = (n: number) => Math.round(n * 100);

  return (
    <div className="macro-rings">
      <div className="macro-rings__chart">
        <svg viewBox="0 0 128 128" aria-hidden="true">
          {rings.map((ring, i) => {
            const c = 2 * Math.PI * ring.r;
            return (
              <g key={ring.key} transform="rotate(-90 64 64)">
                <circle cx="64" cy="64" r={ring.r} className="macro-rings__track" style={{ stroke: ring.color }} />
                <circle
                  cx="64"
                  cy="64"
                  r={ring.r}
                  className="macro-rings__arc"
                  style={
                    {
                      stroke: ring.color,
                      strokeDasharray: c,
                      "--c": c,
                      "--to": c * (1 - ring.share),
                      strokeDashoffset: c * (1 - ring.share),
                      animationDelay: `${i * 120}ms`,
                    } as CSSProperties
                  }
                />
              </g>
            );
          })}
        </svg>
        <div className="macro-rings__center">
          <CountUp value={goal.calories} decimals={0} className="num font-display text-2xl font-medium leading-none" />
          <span className="text-xs text-ice-300">kcal / dia</span>
        </div>
      </div>

      <ul className="macro-rings__legend">
        {rings.map((ring) => (
          <li key={ring.key}>
            <span className="macro-rings__swatch" style={{ background: ring.color }} aria-hidden="true" />
            <span>{ring.label}</span>
            <span className="num ml-auto font-medium">{ring.grams} g</span>
            <span className="num w-10 text-right text-sm text-ice-300">{pct(ring.share)}%</span>
          </li>
        ))}
      </ul>
      {weightKg && (
        <p className="text-sm text-ice-300">
          Proteína: <span className="num text-ice-100">{formatDecimal(goal.proteinG / weightKg, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} g/kg</span> de peso corporal
        </p>
      )}
    </div>
  );
}
