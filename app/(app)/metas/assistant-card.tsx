import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { deltaTone } from "@/lib/calculations";
import { formatDayMonth, formatSigned } from "@/lib/format";
import { formatDecimal } from "@/lib/number";
import { applyAdjustment, type Recommendation } from "@/lib/recomp-rules";
import { ApplyButton } from "./apply-button";

const TONE: Record<Recommendation["kind"], "good" | "act" | "neutral"> = {
  perfect: "good",
  working: "good",
  cut: "act",
  "cut-fat": "act",
  raise: "act",
  watch: "neutral",
  "measure-arms": "neutral",
  insufficient: "neutral",
};

type Goal = { calories: number; proteinG: number; carbsG: number; fatG: number };

/** Cartão do assistente de check-in (secção 7.6). */
export function AssistantCard({
  rec,
  active,
  today,
}: {
  rec: Recommendation;
  active: Goal | null;
  today: string;
}) {
  const next = rec.adjustment && active ? applyAdjustment(active, rec.adjustment) : null;
  const dueDate = new Date(`${today}T00:00:00Z`);
  dueDate.setUTCDate(dueDate.getUTCDate() + rec.daysUntilDue);

  return (
    <Card className="assistant" data-tone={TONE[rec.kind]} spotlight={false}>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Assistente de check-in</p>
        <Sparkles className="size-5 text-acid-400" aria-hidden="true" />
      </div>

      <div className="grid gap-2">
        <h2 className="assistant__title">{rec.title}</h2>
        <p className="max-w-2xl text-ice-300">{rec.message}</p>
      </div>

      {(rec.waist || rec.arm) && (
        <dl className="assistant__facts">
          {rec.waist && (
            <div>
              <dt>Cintura</dt>
              <dd className="num">
                {formatDecimal(rec.waist.before)} → {formatDecimal(rec.waist.after)} cm
              </dd>
              <dd>
                <DeltaBadge
                  tone={deltaTone("waistCm", rec.waist.delta)}
                  delta={rec.waist.delta}
                  label={`${formatSigned(rec.waist.delta)} cm`}
                />
              </dd>
            </div>
          )}
          {rec.arm && (
            <div>
              <dt>Braço (média)</dt>
              <dd className="num">
                {formatDecimal(rec.arm.before)} → {formatDecimal(rec.arm.after)} cm
              </dd>
              <dd>
                <DeltaBadge
                  tone={deltaTone("armRightCm", rec.arm.delta)}
                  delta={rec.arm.delta}
                  label={`${formatSigned(rec.arm.delta)} cm`}
                />
              </dd>
            </div>
          )}
          {rec.waist && (
            <div>
              <dt>Força</dt>
              <dd>{rec.strengthDropping ? "a cair" : "estável"}</dd>
            </div>
          )}
          {rec.waist && (
            <div>
              <dt>Período</dt>
              <dd className="num">
                {formatDayMonth(rec.waist.from)} → {formatDayMonth(rec.waist.to)}
              </dd>
            </div>
          )}
        </dl>
      )}

      {next && active && (
        <div className="assistant__change">
          <span className="num">{active.calories}</span>
          <ArrowRight aria-hidden="true" />
          <span className="num font-semibold">{next.calories} kcal</span>
          <span className="text-sm text-ice-300">
            {rec.adjustment!.fatG !== 0 && `gordura ${active.fatG} → ${next.fatG} g`}
            {rec.adjustment!.carbsG !== 0 && `hidratos ${active.carbsG} → ${next.carbsG} g`}
            {" · proteína mantém-se"}
          </span>
        </div>
      )}

      {rec.due ? (
        next ? (
          <ApplyButton />
        ) : null
      ) : (
        <p className="text-sm text-ice-300">
          Próximo check-in daqui a <span className="num text-ice-100">{rec.daysUntilDue}</span>{" "}
          {rec.daysUntilDue === 1 ? "dia" : "dias"} ({formatDayMonth(dueDate.toISOString().slice(0, 10))}).
          {next ? " Nessa altura podes aplicar o ajuste." : ""}
        </p>
      )}

      <p className="assistant__note">
        É a cintura que decide, não o braço: o braço também sobe com gordura e água, e músculo
        natural no braço cresce no máximo ~0,5 cm por mês. Variações abaixo de 0,3 cm contam como
        iguais (erro de medição).
      </p>
    </Card>
  );
}
