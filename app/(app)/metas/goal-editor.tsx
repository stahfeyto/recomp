"use client";

import { Lock, LockOpen, TriangleAlert } from "lucide-react";
import { useActionState, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { haptic } from "@/lib/haptics";
import { KCAL_MISMATCH, macroKcal, macroShares, redistribute, type MacroKey, type Macros } from "@/lib/macros";
import { formatDecimal } from "@/lib/number";
import { saveGoal, type SaveGoalState } from "./actions";
import { MacroDonut } from "./donut";

const MACROS: { key: MacroKey; label: string; color: string; min: number; max: number; step: number }[] = [
  { key: "proteinG", label: "Proteína", color: "var(--cobalt-400)", min: 60, max: 300, step: 5 },
  { key: "carbsG", label: "Hidratos", color: "var(--acid-400)", min: 0, max: 500, step: 5 },
  { key: "fatG", label: "Gordura", color: "var(--vermillion-500)", min: 20, max: 150, step: 1 },
];

const initial: SaveGoalState = { status: "idle", nonce: 0 };

type Goal = { label: string; calories: number; proteinG: number; carbsG: number; fatG: number };

/**
 * Editor de metas: sliders + números para os macros, calorias calculadas (4/4/9) com
 * aviso se o valor manual não bater certo, e opção de bloquear as calorias e
 * redistribuir os macros. Guardar cria uma nova entrada no histórico.
 */
export function GoalEditor({
  active,
  today,
  weightKg,
}: {
  active: Goal | null;
  today: string;
  weightKg: number | null;
}) {
  const start: Macros = {
    proteinG: active?.proteinG ?? 160,
    carbsG: active?.carbsG ?? 250,
    fatG: active?.fatG ?? 62,
  };
  const [macros, setMacros] = useState<Macros>(start);
  const [calories, setCalories] = useState<number>(active?.calories ?? macroKcal(start));
  // Metas com uma pequena diferença (ex.: 2200 kcal para macros de 2198) contam como
  // calculadas: ao mexer num macro, as calorias acompanham.
  const [manualCalories, setManualCalories] = useState(
    active ? Math.abs(active.calories - macroKcal(start)) > KCAL_MISMATCH : false,
  );
  const [locked, setLocked] = useState(false);
  // Até mexeres num macro, mostra as calorias guardadas (ex.: 2050 de um ajuste de −150).
  const [touched, setTouched] = useState(false);
  const { toast } = useToast();

  const computed = macroKcal(macros);
  const shownCalories = manualCalories || locked || !touched ? calories : computed;
  const mismatch = shownCalories - computed;
  const shares = macroShares(macros);

  const [state, action, pending] = useActionState(async (prev: SaveGoalState, fd: FormData) => {
    const res = await saveGoal(prev, fd);
    if (res.status === "ok") {
      haptic(15);
      toast({ variant: "success", title: res.message ?? "Meta guardada" });
    } else if (res.errors?.form) {
      toast({ variant: "error", title: res.errors.form });
    }
    return res;
  }, initial);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  function setMacro(key: MacroKey, grams: number) {
    if (Number.isNaN(grams)) return;
    setTouched(true);
    if (locked) {
      setMacros((m) => redistribute(m, key, grams, calories));
    } else {
      setMacros((m) => ({ ...m, [key]: Math.max(0, Math.round(grams)) }));
    }
  }

  function toggleLock() {
    if (!locked) setCalories(shownCalories);
    setLocked((v) => !v);
  }

  return (
    <form action={action} className="goal-editor" noValidate>
      <div className="goal-editor__top">
        <MacroDonut macros={macros} calories={shownCalories} />

        <div className="grid content-start gap-3">
          <div className="field">
            <label htmlFor="goal-calories" className="field__label">
              Calorias por dia
            </label>
            <div className="flex items-stretch gap-2">
              <div className="input-affix flex-1">
                <input
                  id="goal-calories"
                  name="calories"
                  className="input input--xl"
                  inputMode="numeric"
                  value={shownCalories}
                  readOnly={locked}
                  aria-invalid={errors.calories ? true : undefined}
                  aria-describedby="goal-calories-hint"
                  onChange={(e) => {
                    const v = parseInt(e.target.value.replace(/\D/g, ""), 10);
                    setManualCalories(true);
                    setCalories(Number.isNaN(v) ? 0 : v);
                  }}
                />
                <span className="input-affix__unit" aria-hidden="true">
                  kcal
                </span>
              </div>
              <Button
                variant={locked ? "primary" : "secondary"}
                icon
                className="h-auto"
                aria-pressed={locked}
                aria-label={locked ? "Desbloquear calorias" : "Bloquear calorias e redistribuir os macros"}
                onClick={toggleLock}
              >
                {locked ? <Lock /> : <LockOpen />}
              </Button>
            </div>
            <p id="goal-calories-hint" className="field__hint">
              {locked
                ? "Calorias bloqueadas: ao mexer num macro, os outros dois ajustam-se."
                : `Dos macros: ${computed} kcal (proteína e hidratos ×4, gordura ×9).`}
            </p>
            {errors.calories && <p className="field__error">{errors.calories}</p>}
          </div>

          {!locked && Math.abs(mismatch) > KCAL_MISMATCH && (
            <div className="goal-editor__warning" role="status">
              <TriangleAlert aria-hidden="true" />
              <p>
                As calorias não batem certo com os macros ({mismatch > 0 ? "+" : "−"}
                {Math.abs(mismatch)} kcal).
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setManualCalories(false);
                  setCalories(computed);
                }}
              >
                Usar {computed}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="goal-editor__macros">
        {MACROS.map((m) => {
          const kcal = macros[m.key] * (m.key === "fatG" ? 9 : 4);
          return (
            <div key={m.key} className="macro-row" style={{ "--c": m.color } as CSSProperties}>
              <div className="macro-row__head">
                <label htmlFor={`goal-${m.key}`} className="macro-row__label">
                  <span className="macro-row__swatch" aria-hidden="true" />
                  {m.label}
                </label>
                <span className="text-xs text-ice-300 num">
                  {kcal} kcal · {Math.round(shares[m.key] * 100)}%
                  {m.key === "proteinG" && weightKg
                    ? ` · ${formatDecimal(macros.proteinG / weightKg, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} g/kg`
                    : ""}
                </span>
              </div>
              <div className="macro-row__controls">
                <input
                  type="range"
                  className="macro-row__slider"
                  style={
                    {
                      "--p": `${((Math.min(m.max, Math.max(m.min, macros[m.key])) - m.min) / (m.max - m.min)) * 100}%`,
                    } as CSSProperties
                  }
                  min={m.min}
                  max={m.max}
                  step={m.step}
                  value={Math.min(m.max, Math.max(m.min, macros[m.key]))}
                  onChange={(e) => setMacro(m.key, Number(e.target.value))}
                  aria-label={`${m.label} em gramas`}
                  aria-valuetext={`${macros[m.key]} gramas`}
                />
                <div className="input-affix macro-row__num">
                  <input
                    id={`goal-${m.key}`}
                    name={m.key}
                    className="input"
                    inputMode="numeric"
                    value={macros[m.key]}
                    aria-invalid={errors[m.key] ? true : undefined}
                    onChange={(e) => setMacro(m.key, parseInt(e.target.value.replace(/\D/g, "") || "0", 10))}
                  />
                  <span className="input-affix__unit" aria-hidden="true">
                    g
                  </span>
                </div>
              </div>
              {errors[m.key] && <p className="field__error">{errors[m.key]}</p>}
            </div>
          );
        })}
      </div>

      <div className="goal-editor__meta">
        <TextField label="Nome" name="label" defaultValue={active?.label ?? "Recomposição"} error={errors.label} />
        <TextField
          label="Em vigor a partir de"
          name="effectiveFrom"
          type="date"
          defaultValue={today}
          error={errors.effectiveFrom}
        />
        <TextAreaField
          label="Notas (opcional)"
          name="notes"
          rows={2}
          placeholder="Ex.: subi hidratos para os dias de treino de pernas"
          error={errors.notes}
          className="goal-editor__notes"
        />
      </div>

      <Button type="submit" variant="primary" size="lg" loading={pending} className="justify-self-start">
        {pending ? "A guardar…" : "Guardar nova meta"}
      </Button>
      <p className="-mt-2 text-sm text-ice-300">
        Fica uma nova entrada no histórico; as metas antigas não são apagadas.
      </p>
    </form>
  );
}
