"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useActionState, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { deltaTone } from "@/lib/calculations";
import { cn } from "@/lib/cn";
import type { MeasurementRow } from "@/lib/data/measurements";
import { formatDayMonth, formatSigned } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { FORM_STEPS, MEASURES, type MeasureKey } from "@/lib/measures";
import { formatDecimal, parseDecimal } from "@/lib/number";
import { saveMeasurement, type SaveMeasurementState } from "./actions";
import { Celebration } from "./celebration";
import { DeltaBadge } from "./delta-badge";

type LastValues = Partial<Record<MeasureKey, { value: number; date: string }>>;

const initialState: SaveMeasurementState = { status: "idle", nonce: 0 };

function toInputValue(n: number | null | undefined): string {
  return typeof n === "number" ? formatDecimal(n, { maximumFractionDigits: 2 }) : "";
}

function emptyValues(): Record<MeasureKey, string> {
  return Object.fromEntries(MEASURES.map((m) => [m.key, ""])) as Record<MeasureKey, string>;
}

function strengthValue(v: boolean | null | undefined): string {
  return v === true ? "sim" : v === false ? "nao" : "";
}

/**
 * Registo semanal. No telemóvel em passos (só os campos do passo atual ficam visíveis,
 * mas todos vão no mesmo formulário); no desktop / no modo edição, tudo de uma vez.
 */
export function MeasurementForm({
  today,
  lastValues,
  initial,
  onDone,
}: {
  today: string;
  lastValues: LastValues;
  /** Com `initial` o formulário edita esse registo. */
  initial?: MeasurementRow;
  onDone?: () => void;
}) {
  const editing = Boolean(initial);
  const { toast } = useToast();

  const [values, setValues] = useState<Record<MeasureKey, string>>(() => {
    if (!initial) return emptyValues();
    return Object.fromEntries(
      MEASURES.map((m) => [m.key, toInputValue(initial[m.key])]),
    ) as Record<MeasureKey, string>;
  });
  const [date, setDate] = useState(initial?.date ?? today);
  const [strength, setStrength] = useState(strengthValue(initial?.strengthDropping));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [step, setStep] = useState(0);
  const [celebrate, setCelebrate] = useState(0);

  // A ação chama o servidor e reage à resposta (toasts, passo com erro, limpar campos).
  const [state, action, pending] = useActionState(
    async (prev: SaveMeasurementState, formData: FormData) => {
      const res = await saveMeasurement(prev, formData);

      if (res.status === "error") {
        const firstKey = MEASURES.find((m) => res.errors?.[m.key]);
        if (res.errors?.date) setStep(0);
        else if (firstKey) setStep(firstKey.step);
        if (res.errors?.form) toast({ variant: "error", title: res.errors.form });
        return res;
      }

      haptic(15);
      const records = res.records ?? [];
      if (records.length > 0) {
        // Um só toast: o recorde vai na descrição.
        toast({
          variant: "success",
          title: records.length > 1 ? "Novos recordes!" : "Novo recorde!",
          description: records
            .map(
              (r) =>
                `${r.kind === "waist" ? "Menor cintura" : "Maior braço"}: ${formatDecimal(r.value)} cm (antes ${formatDecimal(r.previous)})`,
            )
            .join(" · "),
          duration: 7000,
        });
      } else {
        toast({ variant: "success", title: res.message ?? "Guardado" });
      }
      if (records.length > 0) {
        setCelebrate((n) => n + 1);
        haptic([15, 60, 25]);
      }

      if (editing) {
        onDone?.();
      } else {
        setValues(emptyValues());
        setStrength("");
        setNotes("");
        setDate(today);
        setStep(0);
      }
      return res;
    },
    initialState,
  );

  const errors = state.status === "error" ? (state.errors ?? {}) : {};
  const lastStep = FORM_STEPS.length - 1;

  const setValue = (key: MeasureKey, v: string) => setValues((cur) => ({ ...cur, [key]: v }));

  // No telemóvel, "Enter" num campo avança para o passo seguinte em vez de gravar.
  const onFieldKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || editing || step === lastStep) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    e.preventDefault();
    setStep((s) => Math.min(lastStep, s + 1));
  };

  function hintFor(key: MeasureKey) {
    const last = lastValues[key];
    if (!last) return undefined;
    const unit = MEASURES.find((m) => m.key === key)!.unit;
    const current = parseDecimal(values[key]);
    if (current === null) {
      return (
        <>
          Última: {formatDecimal(last.value)} {unit} · {formatDayMonth(last.date)}
        </>
      );
    }
    const delta = current - last.value;
    return (
      <DeltaBadge
        tone={deltaTone(key, delta)}
        delta={delta}
        label={`${formatSigned(delta)} ${unit} face a ${formatDecimal(last.value)} (${formatDayMonth(last.date)})`}
      />
    );
  }

  return (
    <form
      action={action}
      className={cn("measure-form", editing && "measure-form--full")}
      data-step={step}
      noValidate
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}

      {!editing && (
        <div className="measure-form__progress" aria-hidden="true">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-ice-100">{FORM_STEPS[step].title}</span>
            <span className="num text-ice-300">
              {step + 1} / {FORM_STEPS.length}
            </span>
          </div>
          <div className="measure-form__bar">
            <span style={{ transform: `scaleX(${(step + 1) / FORM_STEPS.length})` }} />
          </div>
        </div>
      )}

      {FORM_STEPS.map((s, i) => (
        <fieldset
          key={s.title}
          className="measure-form__step"
          data-active={i === step ? "true" : "false"}
        >
          <legend className="measure-form__legend">{s.title}</legend>
          <div className="measure-form__fields">
            {i === 0 && (
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
            )}

            {MEASURES.filter((m) => m.step === i).map((m) => (
              <TextField
                key={m.key}
                label={m.optional ? `${m.label} (opcional)` : m.label}
                name={m.key}
                unit={m.unit}
                size="xl"
                decimal
                value={values[m.key]}
                onChange={(e) => setValue(m.key, e.target.value)}
                onKeyDown={onFieldKeyDown}
                placeholder={lastValues[m.key] ? formatDecimal(lastValues[m.key]!.value) : undefined}
                hint={hintFor(m.key)}
                error={errors[m.key]}
              />
            ))}

            {i === lastStep && (
              <>
                <fieldset className="field">
                  <legend className="field__label mb-1.5">A força está a cair?</legend>
                  <div className="segmented" role="radiogroup">
                    {[
                      { v: "nao", l: "Não" },
                      { v: "sim", l: "Sim" },
                      { v: "", l: "Não sei" },
                    ].map((o) => (
                      <label key={o.l}>
                        <input
                          type="radio"
                          name="strength"
                          value={o.v}
                          checked={strength === o.v}
                          onChange={() => setStrength(o.v)}
                        />
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
                  placeholder="Ex.: medido de manhã, antes de comer"
                  error={errors.notes}
                  className="measure-form__notes"
                />
              </>
            )}
          </div>
        </fieldset>
      ))}

      {errors.form && (
        <p className="field__error" role="alert">
          {errors.form}
        </p>
      )}

      <div className="measure-form__actions">
        {!editing && (
          <div className="measure-form__nav">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ArrowLeft /> Anterior
            </Button>
            {step < lastStep && (
              <Button variant="secondary" onClick={() => setStep((s) => s + 1)}>
                Seguinte <ArrowRight />
              </Button>
            )}
          </div>
        )}
        <div className="measure-form__submit">
          {celebrate > 0 && <Celebration key={celebrate} />}
          <Button type="submit" variant="primary" size="lg" block loading={pending}>
            {pending ? (
              "A guardar…"
            ) : (
              <>
                <Check /> {editing ? "Guardar alterações" : "Guardar medição"}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
