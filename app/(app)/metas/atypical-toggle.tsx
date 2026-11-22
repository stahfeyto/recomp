"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { haptic } from "@/lib/haptics";
import { setAtypicalWeek } from "./actions";

const REASONS = ["Falhei treinos", "Comi fora do plano"] as const;

/** "Semana atípica": quando marcada, o assistente não sugere cortes nesta semana. */
export function AtypicalToggle({ atypical, reason }: { atypical: boolean; reason: string | null }) {
  const [checked, setChecked] = useState(atypical);
  const [reasons, setReasons] = useState<string[]>(reason ? reason.split(" · ") : []);
  const [pending, start] = useTransition();
  const { toast } = useToast();

  function save(nextChecked: boolean, nextReasons: string[]) {
    start(async () => {
      const res = await setAtypicalWeek(nextChecked, nextChecked && nextReasons.length ? nextReasons.join(" · ") : null);
      if (res.ok) haptic(10);
      toast({ variant: res.ok ? "success" : "error", title: res.message });
      if (!res.ok) setChecked(!nextChecked);
    });
  }

  return (
    <fieldset className="atypical" aria-busy={pending || undefined}>
      <label className="atypical__switch">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={pending}
          onChange={(e) => {
            setChecked(e.target.checked);
            save(e.target.checked, reasons);
          }}
        />
        <span className="atypical__track" aria-hidden="true">
          <span className="atypical__knob" />
        </span>
        <span className="grid">
          <span className="font-medium">Semana atípica</span>
          <span className="text-sm text-ice-300">Sem cortes esta semana (falhei treinos ou comi fora do plano).</span>
        </span>
      </label>
      {checked && (
        <div className="atypical__reasons" role="group" aria-label="Porquê">
          {REASONS.map((r) => {
            const on = reasons.includes(r);
            return (
              <button
                key={r}
                type="button"
                className="atypical__chip"
                aria-pressed={on}
                disabled={pending}
                onClick={() => {
                  const next = on ? reasons.filter((x) => x !== r) : [...reasons, r];
                  setReasons(next);
                  save(true, next);
                }}
              >
                {r}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
