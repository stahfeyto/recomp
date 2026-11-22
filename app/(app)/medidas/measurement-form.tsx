"use client";

import { Check, ChevronDown } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { TextAreaField, TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { MeasurementRow } from "@/lib/data/measurements";
import { formatDayMonth, formatSigned } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { MEASURE_BY_KEY, type MeasureKey } from "@/lib/measures";
import { comparePoints, toneOf } from "@/lib/metrics";
import { formatDecimal, parseDecimal } from "@/lib/number";
import { saveMeasurement, type SaveMeasurementState } from "./actions";
import { Celebration } from "./celebration";

type LastValues = Partial<Record<MeasureKey, { value: number; date: string }>>;

const initialState: SaveMeasurementState = { status: "idle", nonce: 0 };

/** Secções do formulário completo (o peso e a cintura diários estão em "Registar hoje"). */
const SECTIONS: { title: string; keys: MeasureKey[] }[] = [
  { title: "Braços", keys: ["armRightCm", "armLeftCm"] },
  { title: "Peito e ombros", keys: ["chestCm", "shouldersCm"] },
  { title: "Extras", keys: ["thighCm", "calfCm", "neckCm"] },
];

function toInputValue(n: number | null | undefined): string {
  return typeof n === "number" ? formatDecimal(n, { maximumFractionDigits: 2 }) : "";
}

function strengthValue(v: boolean | null | undefined): string {
  return v === true ? "sim" : v === false ? "nao" : "";
}

/**
 * Formulário completo (braço, peito, ombros, extras, força, notas) em secções que
 * abrem e fecham. Ao editar um registo, mostra também o peso e a cintura que esse
 * registo tiver — e só grava os campos mostrados, por isso nada é apagado sem querer.
 */
export function MeasurementForm({
  today,
  lastValues,
  initial,
  onDone,
}: {
  today: string;
  lastValues: LastValues;
  initial?: MeasurementRow;
  onDone?: () => void;
}) {
  const editing = Boolean(initial);
  const sections = editing
    ? [
        ...(typeof initial?.weightKg === "number" || typeof initial?.waistCm === "number"
          ? [
              {
                title: "Peso e cintura",
                keys: (["weightKg", "waistCm"] as MeasureKey[]).filter((k) => typeof initial?.[k] === "number"),
              },
            ]
          : []),
        ...SECTIONS,
      ]
    : SECTIONS;
  const allKeys = sections.flatMap((s) => s.keys);

  const { toast } = useToast();
  const [values, setValues] = useState<Partial<Record<MeasureKey, string>>>(() =>
    Object.fromEntries(allKeys.map((k) => [k, toInputValue(initial?.[k])])),
  );
  const [date, setDate] = useState(initial?.date ?? today);
  const [strength, setStrength] = useState(strengthValue(initial?.strengthDropping));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [celebrate, setCelebrate] = useState(0);

  const [state, action, pending] = useActionState(async (prev: SaveMeasurementState, formData: FormData) => {
    const res = await saveMeasurement(prev, formData);
    if (res.status === "error") {
      if (res.errors?.form) toast({ variant: "error", title: res.errors.form });
      return res;
    }
    haptic(15);
    const records = res.records ?? [];
    if (records.length > 0) {
      toast({
        variant: "success",
        title: "Novo recorde de braço!",
        description: records.map((r) => `${formatDecimal(r.value)} cm (antes ${formatDecimal(r.previous)})`).join(" · "),
        duration: 7000,
      });
      setCelebrate((n) => n + 1);
      haptic([15, 60, 25]);
    } else {
      toast({ variant: "success", title: res.message ?? "Guardado" });
    }
    if (editing) onDone?.();
    else {
      setValues(Object.fromEntries(allKeys.map((k) => [k, ""])));
      setStrength("");
      setNotes("");
      setDate(today);
    }
    return res;
  }, initialState);

  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  function hintFor(key: MeasureKey) {
    const last = lastValues[key];
    if (!last) return undefined;
    const unit = MEASURE_BY_KEY[key].unit;
    const current = parseDecimal(values[key] ?? "");
    if (current === null) {
      return (
        <>
          Último: {formatDecimal(last.value)} {unit} · {formatDayMonth(last.date)}
        </>
      );
    }
    const c = comparePoints({ date, value: current }, last);
    return (
      <DeltaBadge
        tone={toneOf(key, c.trend)}
        delta={c.delta}
        label={`${formatSigned(c.delta)} ${unit} face a ${formatDecimal(last.value)} (${formatDayMonth(last.date)})${c.trend === "same" ? " · igual" : ""}`}
      />
    );
  }

  const sectionHasError = (keys: MeasureKey[]) => keys.some((k) => errors[k]);

  return (
    <form action={action} className="full-form" noValidate>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <TextField
        label="Data"
        name="date"
        type="date"
        value={date}
        max={today}
        onChange={(e) => setDate(e.target.value)}
        error={errors.date}
        required
      />

      {sections.map((s, i) => (
        <details key={s.title} className="full-form__section" open={editing || i === 0 || sectionHasError(s.keys)}>
          <summary>
            <span>{s.title}</span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <div className="full-form__fields">
            {s.keys.map((key) => {
              const m = MEASURE_BY_KEY[key];
              return (
                <TextField
                  key={key}
                  label={m.optional ? `${m.label} (opcional)` : m.label}
                  name={key}
                  unit={m.unit}
                  size="xl"
                  decimal
                  value={values[key] ?? ""}
                  onChange={(e) => setValues((cur) => ({ ...cur, [key]: e.target.value }))}
                  placeholder={lastValues[key] ? formatDecimal(lastValues[key]!.value) : undefined}
                  hint={hintFor(key)}
                  error={errors[key]}
                />
              );
            })}
          </div>
        </details>
      ))}

      <details className="full-form__section" open={editing}>
        <summary>
          <span>Força e notas</span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="full-form__fields">
          <fieldset className="field">
            <legend className="field__label mb-1.5">A força está a cair?</legend>
            <div className="segmented" role="radiogroup">
              {[
                { v: "nao", l: "Não" },
                { v: "sim", l: "Sim" },
                { v: "", l: "Não sei" },
              ].map((o) => (
                <label key={o.l}>
                  <input type="radio" name="strength" value={o.v} checked={strength === o.v} onChange={() => setStrength(o.v)} />
                  <span>{o.l}</span>
                </label>
              ))}
            </div>
            <p className="field__hint mt-1.5">Usado pelo assistente de check-in.</p>
          </fieldset>
          <TextAreaField
            label="Notas (opcional)"
            name="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: medido de manhã, contraído"
            error={errors.notes}
          />
        </div>
      </details>

      {errors.form && (
        <p className="field__error" role="alert">
          {errors.form}
        </p>
      )}

      <div className="measure-form__submit">
        {celebrate > 0 && <Celebration key={celebrate} />}
        <Button type="submit" variant="primary" size="lg" block loading={pending}>
          {pending ? (
            "A guardar…"
          ) : (
            <>
              <Check /> {editing ? "Guardar alterações" : "Guardar medidas"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
