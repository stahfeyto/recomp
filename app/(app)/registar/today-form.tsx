"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { saveToday, type SaveTodayState } from "@/app/(app)/medidas/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { TodayData } from "@/lib/data/measurements";
import { formatDayMonth } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { RELIABILITY_LABEL, type WindowStat } from "@/lib/metrics";
import { formatDecimal, parseDecimal } from "@/lib/number";

const initialState: SaveTodayState = { status: "idle", nonce: 0 };

type FieldState = { text: string; touched: boolean };

const fmt1 = (n: number) => formatDecimal(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function initialField(today: number | null, last: { value: number } | null): FieldState {
  if (today !== null) return { text: fmt1(today), touched: true };
  if (last) return { text: fmt1(last.value), touched: false };
  return { text: "", touched: false };
}

/**
 * "Registar hoje": peso e cintura do dia em poucos toques. Cada campo vem com o
 * último valor; um valor pré-preenchido de outro dia só é gravado depois de lhe
 * tocares (±, escrever ou "Usar este valor").
 */
export function TodayForm({ data }: { data: TodayData }) {
  const { toast } = useToast();
  const [weight, setWeight] = useState(() => initialField(data.weight.today, data.weight.last));
  const [waist, setWaist] = useState(() => initialField(data.waist.today, data.waist.last));
  const [date, setDate] = useState(data.today);
  const [otherDay, setOtherDay] = useState(false);
  const [saved, setSaved] = useState(0);

  const [state, action, pending] = useActionState(async (prev: SaveTodayState, fd: FormData) => {
    const res = await saveToday(prev, fd);
    if (res.status === "ok") {
      haptic(15);
      setSaved((n) => n + 1);
      toast({ variant: "success", title: res.message ?? "Guardado" });
    } else if (res.errors?.form) {
      toast({ variant: "error", title: res.errors.form });
    }
    return res;
  }, initialState);

  const errors = state.status === "error" ? (state.errors ?? {}) : {};
  const nothing = !weight.touched && !waist.touched;

  return (
    <form action={action} className="today-form" noValidate>
      <input type="hidden" name="date" value={date} />

      <StepperField
        label="Peso"
        name="weightKg"
        unit="kg"
        state={weight}
        onChange={setWeight}
        error={errors.weightKg}
        yesterday={data.weight.yesterday}
        last={data.weight.last}
        today={data.today}
        week={data.weight.week}
      />
      <StepperField
        label="Cintura"
        name="waistCm"
        unit="cm"
        state={waist}
        onChange={setWaist}
        error={errors.waistCm}
        yesterday={data.waist.yesterday}
        last={data.waist.last}
        today={data.today}
        week={data.waist.week}
      />

      <div className="today-form__date">
        {otherDay ? (
          <label className="field">
            <span className="field__label">Data do registo</span>
            <input className="input" type="date" value={date} max={data.today} onChange={(e) => setDate(e.target.value)} />
          </label>
        ) : (
          <button type="button" className="link-button" onClick={() => setOtherDay(true)}>
            Registar noutro dia
          </button>
        )}
        {errors.date && <p className="field__error">{errors.date}</p>}
      </div>

      {errors.form && (
        <p className="field__error" role="alert">
          {errors.form}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" block loading={pending} disabled={nothing}>
        {pending ? "A guardar…" : <>Guardar {date === data.today ? "hoje" : formatDayMonth(date)}</>}
      </Button>

      {saved > 0 && state.status === "ok" && (
        <p key={saved} className="today-form__saved" role="status">
          <span className="today-form__check" aria-hidden="true">
            <Check />
          </span>
          Guardado
        </p>
      )}
    </form>
  );
}

function StepperField({
  label,
  name,
  unit,
  state,
  onChange,
  error,
  yesterday,
  last,
  today,
  week,
}: {
  label: string;
  name: string;
  unit: string;
  state: FieldState;
  onChange: (s: FieldState) => void;
  error?: string;
  yesterday: number | null;
  last: { date: string; value: number } | null;
  today: string;
  week: WindowStat | null;
}) {
  const id = useId();
  const hintId = `${id}-hint`;

  function step(delta: number) {
    const current = parseDecimal(state.text) ?? last?.value ?? 0;
    const next = Math.round((current + delta) * 10) / 10;
    onChange({ text: fmt1(Math.max(0, next)), touched: true });
  }

  const fromOtherDay = !state.touched && state.text !== "";

  return (
    <div className="stepper" data-pending={fromOtherDay || undefined}>
      <div className="stepper__head">
        <label htmlFor={id} className="stepper__label">
          {label}
        </label>
        {fromOtherDay && last && (
          <button type="button" className="link-button" onClick={() => onChange({ ...state, touched: true })}>
            Usar {fmt1(last.value)} {unit}
          </button>
        )}
      </div>
      <div className="stepper__row">
        <button type="button" className="stepper__btn" aria-label={`Menos 0,1 ${unit}`} onClick={() => step(-0.1)}>
          <Minus />
        </button>
        <div className="input-affix stepper__input">
          <input
            id={id}
            // Só vai no formulário depois de confirmado (tocado): sem gravar valores de outro dia por engano.
            name={state.touched ? name : undefined}
            className="input input--xl"
            inputMode="decimal"
            autoComplete="off"
            value={state.text}
            aria-invalid={error ? true : undefined}
            aria-describedby={hintId}
            onChange={(e) => onChange({ text: e.target.value, touched: true })}
          />
          <span className="input-affix__unit" aria-hidden="true">
            {unit}
          </span>
        </div>
        <button type="button" className="stepper__btn" aria-label={`Mais 0,1 ${unit}`} onClick={() => step(0.1)}>
          <Plus />
        </button>
      </div>
      <p id={hintId} className="stepper__hint">
        {fromOtherDay && last ? (
          last.date === today ? (
            <>Valor da medição completa de hoje: toca em «Usar», ± ou escreve para o guardar.</>
          ) : (
            <>Último valor ({formatDayMonth(last.date)}): toca em ± ou escreve para registar hoje.</>
          )
        ) : yesterday !== null ? (
          <>
            Ontem: <span className="num">{fmt1(yesterday)} {unit}</span>
          </>
        ) : last ? (
          <>
            Último: <span className="num">{fmt1(last.value)} {unit}</span> · {formatDayMonth(last.date)}
          </>
        ) : (
          "Ainda sem registos."
        )}
        {week && (
          <span className="stepper__week">
            {" "}
            · {week.reliability === "fiavel" ? "média 7 dias" : RELIABILITY_LABEL[week.reliability]}:{" "}
            <span className="num">
              {fmt1(week.value)} {unit}
            </span>
          </span>
        )}
      </p>
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}
