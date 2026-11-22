import type { CSSProperties } from "react";
import { CountUp } from "@/components/ui/count-up";
import { formatDecimal } from "@/lib/number";

type Goal = { label: string; calories: number; proteinG: number; carbsG: number; fatG: number };

/**
 * Barra de energia: as calorias da meta divididas pelos três macros, em segmentos
 * que crescem da esquerda (proteína = violeta, hidratos = lima, gordura = coral).
 */
export function EnergyBar({ goal, weightKg }: { goal: Goal; weightKg: number | null }) {
  const kcal = { protein: goal.proteinG * 4, carbs: goal.carbsG * 4, fat: goal.fatG * 9 };
  const total = kcal.protein + kcal.carbs + kcal.fat;
  const segs = [
    { key: "protein", label: "Proteína", grams: goal.proteinG, share: kcal.protein / total, color: "var(--violet-400)" },
    { key: "carbs", label: "Hidratos", grams: goal.carbsG, share: kcal.carbs / total, color: "var(--lime-400)" },
    { key: "fat", label: "Gordura", grams: goal.fatG, share: kcal.fat / total, color: "var(--coral-500)" },
  ];
  const pct = (n: number) => Math.round(n * 100);

  return (
    <div className="energy">
      <p className="energy__total">
        <CountUp value={goal.calories} decimals={0} className="num" />
        <span className="energy__unit">kcal / dia</span>
      </p>
      <div
        className="energy__bar"
        role="img"
        aria-label={segs.map((s) => `${s.label} ${pct(s.share)}%`).join(", ")}
      >
        {segs.map((s, i) => (
          <span key={s.key} className="energy__seg" style={{ "--w": `${s.share * 100}%`, "--c": s.color, "--i": i } as CSSProperties} />
        ))}
      </div>
      <ul className="energy__legend">
        {segs.map((s) => (
          <li key={s.key}>
            <span className="energy__swatch" style={{ background: s.color }} aria-hidden="true" />
            <span className="energy__name">{s.label}</span>
            <span className="num energy__grams">{s.grams} g</span>
            <span className="num energy__pct">{pct(s.share)}%</span>
          </li>
        ))}
      </ul>
      {weightKg && (
        <p className="energy__note">
          Proteína: <span className="num text-ice-100">{formatDecimal(goal.proteinG / weightKg, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} g/kg</span> de peso corporal
        </p>
      )}
    </div>
  );
}
