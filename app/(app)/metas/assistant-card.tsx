import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { formatDayMonth, formatSigned } from "@/lib/format";
import { RELIABILITY_LABEL, TREND_LABEL, toneOf } from "@/lib/metrics";
import { formatDecimal } from "@/lib/number";
import { applyAdjustment, type Recommendation } from "@/lib/recomp-rules";
import { ApplyButton } from "./apply-button";
import { AtypicalToggle } from "./atypical-toggle";

const TONE: Record<Recommendation["kind"], "good" | "act" | "neutral" | "warn"> = {
  perfect: "good",
  working: "good",
  "cut-a": "act",
  "cut-b": "act",
  raise: "act",
  atypical: "neutral",
  stagnation: "warn",
  watch: "neutral",
  collect: "neutral",
};

type Goal = { calories: number; proteinG: number; carbsG: number; fatG: number };

/** Cartão do assistente de check-in. */
export function AssistantCard({
  rec,
  active,
  today,
  week,
}: {
  rec: Recommendation;
  active: Goal | null;
  today: string;
  week: { atypical: boolean; reason: string | null };
}) {
  const next = rec.adjustment && active ? applyAdjustment(active, rec.adjustment) : null;
  const dueDate = new Date(`${today}T00:00:00Z`);
  dueDate.setUTCDate(dueDate.getUTCDate() + rec.daysUntilDue);
  const kg = (n: number) => formatDecimal(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <Card className="assistant" data-tone={TONE[rec.kind]} spotlight={false}>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Assistente de check-in</p>
        <Sparkles className="size-5 text-lime-400" aria-hidden="true" />
      </div>

      <div className="grid gap-2">
        <h2 className="assistant__title">{rec.title}</h2>
        <p className="max-w-2xl text-ice-100/90">{rec.message}</p>
      </div>

      {(rec.waist || rec.weight || rec.arm) && (
        <dl className="assistant__facts">
          {rec.waist && (
            <div>
              <dt>Cintura · semana vs anterior</dt>
              <dd className="num">
                {formatDecimal(rec.waist.base.value)} → {formatDecimal(rec.waist.current.value)} cm
              </dd>
              <dd>
                <DeltaBadge
                  tone={toneOf("waistCm", rec.waist.trend)}
                  delta={rec.waist.delta}
                  label={`${formatSigned(rec.waist.delta)} cm · ${TREND_LABEL[rec.waist.trend]}`}
                />
              </dd>
              <dd className="assistant__note-sm">
                {RELIABILITY_LABEL[rec.waist.current.reliability]} ({rec.waist.current.count}) ·{" "}
                {RELIABILITY_LABEL[rec.waist.base.reliability]} ({rec.waist.base.count})
              </dd>
            </div>
          )}
          {rec.weight && (
            <div>
              <dt>Peso · semana vs anterior</dt>
              <dd className="num">
                {kg(rec.weight.base.value)} → {kg(rec.weight.current.value)} kg
              </dd>
              <dd>
                <DeltaBadge tone="neutral" delta={rec.weight.delta} label={`${formatSigned(rec.weight.delta)} kg`} />
              </dd>
              <dd className="assistant__note-sm">
                {rec.weight.current.count} e {rec.weight.base.count} pesagens
              </dd>
            </div>
          )}
          <div>
            <dt>Braço · 4 semanas</dt>
            {rec.arm ? (
              <>
                <dd>
                  <DeltaBadge
                    tone={toneOf("armRightCm", rec.arm.trend)}
                    delta={rec.arm.delta}
                    label={`${formatSigned(rec.arm.delta)} cm · ${TREND_LABEL[rec.arm.trend]}`}
                  />
                </dd>
                <dd className="assistant__note-sm">
                  {formatDayMonth(rec.arm.from)} → {formatDayMonth(rec.arm.to)}
                </dd>
              </>
            ) : (
              <dd className="assistant__note-sm">Ainda sem 4 semanas de registos</dd>
            )}
          </div>
          <div>
            <dt>Força</dt>
            <dd>{rec.strengthDropping ? "a cair" : "estável"}</dd>
          </div>
        </dl>
      )}

      {next && active && (
        <div className="assistant__change">
          <span className="num">{active.calories}</span>
          <ArrowRight aria-hidden="true" />
          <span className="num font-semibold">{next.calories} kcal</span>
          <span className="text-sm text-ice-300">
            hidratos {active.carbsG} → {next.carbsG} g · proteína e gordura mantêm-se
          </span>
        </div>
      )}

      {rec.due ? (
        next ? <ApplyButton /> : null
      ) : (
        <p className="text-sm text-ice-300">
          Próximo check-in daqui a <span className="num text-ice-100">{rec.daysUntilDue}</span>{" "}
          {rec.daysUntilDue === 1 ? "dia" : "dias"} ({formatDayMonth(dueDate.toISOString().slice(0, 10))}).
          {next ? " Nessa altura podes aplicar o ajuste." : ""}
        </p>
      )}

      <AtypicalToggle key={`${week.atypical}-${week.reason ?? ""}`} atypical={week.atypical} reason={week.reason} />

      <p className="assistant__note">
        Só sugiro cortes se a média da cintura subir ≥ 0,5 cm e a do peso ≥ 0,2 kg, ou se a cintura subir duas
        semanas seguidas. Erro de medição: diferenças abaixo de 0,5 cm (valor isolado) ou 0,3 cm (média de 7 dias)
        contam como iguais.
      </p>
    </Card>
  );
}
