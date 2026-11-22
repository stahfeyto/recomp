"use client";

import { Check, Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useId, useState, type CSSProperties } from "react";
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
      haptic([12, 40, 18]);
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

      <Button type="submit" variant="lime" size="lg" block loading={pending} disabled={nothing}>
        {pending ? "A guardar…" : <>Guardar {date === data.today ? "hoje" : formatDayMonth(date)}</>}
      </Button>

      {saved > 0 && state.status === "ok" && (
        <p key={saved} className="today-form__saved" role="status">
          <span className="today-form__check" aria-hidden="true">
            <Check />
            <Burst />
          </span>
          Guardado
        </p>
      )}
    </form>
  );
}

/** Dez partículas (lima e violeta) a sair do ✓ quando se guarda. */
function Burst() {
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} style={{ "--a": `${i * 36}deg` } as CSSProperties} />
      ))}
    </span>
  );
}

type Side = "minus" | "plus";
type Pop = { id: number; side: Side; text: string };

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
  // "+0,1" que salta do botão tocado e o campo a piscar em lima
  const [pop, setPop] = useState<Pop | null>(null);
  const [flash, setFlash] = useState(0);

  function step(delta: number) {
    const current = parseDecimal(state.text) ?? last?.value ?? 0;
    const next = Math.round((current + delta) * 10) / 10;
    onChange({ text: fmt1(Math.max(0, next)), touched: true });
    haptic(8);
    setPop({ id: Date.now(), side: delta < 0 ? "minus" : "plus", text: `${delta < 0 ? "−" : "+"}0,1` });
    setFlash((n) => n + 1);
  }

  const fromOtherDay = !state.touched && state.text !== "";

  const stepButton = (side: Side) => (
    <span className="stepper__btn-wrap">
      <motion.button
        type="button"
        className="stepper__btn"
        aria-label={`${side === "minus" ? "Menos" : "Mais"} 0,1 ${unit}`}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 650, damping: 30 }}
        onClick={() => step(side === "minus" ? -0.1 : 0.1)}
      >
        {side === "minus" ? <Minus /> : <Plus />}
      </motion.button>
      <AnimatePresence>
        {pop && pop.side === side && (
          <motion.span
            key={pop.id}
            className="stepper__pop"
            aria-hidden="true"
            initial={{ opacity: 0, y: 0, scale: 0.7 }}
            animate={{ opacity: [0, 1, 1, 0], y: -38, scale: 1 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            onAnimationComplete={() => setPop((p) => (p?.id === pop.id ? null : p))}
          >
            {pop.text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );

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
        {stepButton("minus")}
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
          {flash > 0 && <span key={flash} className="stepper__flash" aria-hidden="true" />}
        </div>
        {stepButton("plus")}
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
