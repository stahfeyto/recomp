import { ArrowRight, CalendarClock, Dumbbell, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Scene3D } from "@/components/3d/scene-3d";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SHOULDER_WAIST_IDEAL, WAIST_HEIGHT_HEALTHY } from "@/lib/calculations";
import { getDashboardData, type DashboardData } from "@/lib/data/dashboard";
import { formatDateWeekday, formatDayMonth } from "@/lib/format";
import {
  RELIABILITY_LABEL,
  TREND_LABEL,
  toneOf,
  type AveragedSummary,
  type SlowSummary,
} from "@/lib/metrics";
import type { MeasureKey } from "@/lib/measures";
import { formatDecimal } from "@/lib/number";
import { WEEKDAYS } from "@/lib/training";
import { KpiCard, type KpiDelta } from "./_painel/kpi-card";
import { MacroRings } from "./_painel/macro-rings";
import { RatioMeter } from "./_painel/ratio-meter";
import { Sparkline } from "./_painel/sparkline";
import { TypeBadge } from "./treino/training-types";
import "./_painel/painel.css";

export const metadata: Metadata = { title: "Painel · RECOMP" };

/** Variações de uma média de 7 dias (cintura, peso), já com a cor certa. */
function averagedDeltas(s: AveragedSummary | null, key: MeasureKey, unit: string): KpiDelta[] {
  if (!s) return [];
  const out: KpiDelta[] = [];
  if (s.previous) out.push({ label: "vs semana anterior", delta: s.previous.delta, tone: toneOf(key, s.previous.trend), unit });
  if (s.sinceStart) out.push({ label: "desde o início", delta: s.sinceStart.delta, tone: toneOf(key, s.sinceStart.trend), unit });
  return out;
}

/** Variação de uma medida semanal face ao último registo. */
function slowDeltas(s: SlowSummary | null, key: MeasureKey): KpiDelta[] {
  if (!s?.vsLast) return [];
  return [
    {
      label: `vs ${formatDayMonth(s.vsLast.previous.date)}`,
      delta: s.vsLast.delta,
      tone: toneOf(key, s.vsLast.trend),
      unit: "cm",
    },
  ];
}

/** Conclusão a 4 semanas (ou o aviso de que ainda não há 4 semanas). */
function slowNote(s: SlowSummary | null) {
  if (!s) return undefined;
  if (!s.fourWeeks) return "Conclusão a 4 semanas: ainda sem dados suficientes.";
  return `4 semanas: ${TREND_LABEL[s.fourWeeks.trend]} (${s.fourWeeks.delta > 0 ? "+" : s.fourWeeks.delta < 0 ? "−" : ""}${formatDecimal(Math.abs(s.fourWeeks.delta))} cm)`;
}

function badgeOf(s: AveragedSummary | null) {
  if (!s) return {};
  const r = s.current.reliability;
  return {
    badge: r === "fiavel" ? `média de 7 dias · ${s.current.count}` : RELIABILITY_LABEL[r],
    badgeTone: r === "fiavel" ? ("neutral" as const) : ("warn" as const),
  };
}

export default function PainelPage() {
  return (
    <Suspense fallback={<PainelSkeleton />}>
      <Painel />
    </Suspense>
  );
}

async function Painel() {
  const d = await getDashboardData();
  const fmt2 = (n: number) => formatDecimal(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="stagger">
      <PageHeader eyebrow={formatDateWeekday(d.today)} title={`${d.greeting}, ${d.name}`} actions={<Scene3D variant="orb" />} />

      <div className="bento">
        {/* Topo: cintura e peso (médias de 7 dias) e o próximo check-in */}
        <KpiCard
          className="bento__waist"
          size="lg"
          label="Cintura"
          value={d.waist?.current.value ?? null}
          unit="cm"
          {...badgeOf(d.waist)}
          deltas={averagedDeltas(d.waist, "waistCm", "cm")}
          note={
            d.waist && d.waist.current.reliability !== "fiavel"
              ? "Mede a cintura todos os dias: com 4 medições em 7 dias a média fica fiável."
              : undefined
          }
        >
          <Sparkline id="waist" label="Média de 7 dias da cintura nas últimas 8 semanas" unit="cm" points={d.waistSpark} />
        </KpiCard>

        <KpiCard
          className="bento__weight"
          size="lg"
          label="Peso"
          value={d.weight?.current.value ?? null}
          unit="kg"
          {...badgeOf(d.weight)}
          deltas={averagedDeltas(d.weight, "weightKg", "kg")}
        >
          <Sparkline id="weight" label="Média de 7 dias do peso nas últimas 8 semanas" unit="kg" points={d.weightSpark} />
        </KpiCard>

        <CheckInCard d={d} />

        {/* Resto */}
        <TodayTraining d={d} />

        <Card className="bento__macros grid content-start gap-4 p-6">
          <div className="grid gap-1">
            <p className="eyebrow">Metas · {d.activeGoal?.label ?? "sem meta"}</p>
            {d.activeGoal && (
              <span className="text-sm text-ice-300">em vigor desde {formatDayMonth(d.activeGoal.effectiveFrom)}</span>
            )}
          </div>
          {d.activeGoal ? (
            <MacroRings goal={d.activeGoal} weightKg={d.weight?.current.value ?? null} />
          ) : (
            <p className="text-ice-300">Ainda não há metas ativas.</p>
          )}
        </Card>

        <KpiCard
          className="bento__arm"
          label="Braço · média D/E"
          value={d.arm?.latest.value ?? null}
          unit="cm"
          deltas={slowDeltas(d.arm, "armRightCm")}
          note={
            <>
              {slowNote(d.arm)}
              {d.armSides && (
                <span className="block">
                  D {formatDecimal(d.armSides.right)} · E {formatDecimal(d.armSides.left)} · diferença{" "}
                  {formatDecimal(Math.abs(d.armSides.right - d.armSides.left))} cm
                </span>
              )}
            </>
          }
        />
        <KpiCard
          className="bento__chest"
          label="Peito"
          value={d.chest?.latest.value ?? null}
          unit="cm"
          deltas={slowDeltas(d.chest, "chestCm")}
          note={slowNote(d.chest)}
        />
        <KpiCard
          className="bento__shoulders"
          label="Ombros"
          value={d.shoulders?.latest.value ?? null}
          unit="cm"
          deltas={slowDeltas(d.shoulders, "shouldersCm")}
          note={slowNote(d.shoulders)}
        />

        <Card className="bento__ratio kpi">
          <p className="eyebrow">Proporção ombros / cintura</p>
          {d.shoulderWaist ? (
            <>
              <p className="kpi__value">
                <span className="num">{fmt2(d.shoulderWaist)}</span>
              </p>
              <RatioMeter value={d.shoulderWaist} min={1.2} max={1.7} mark={SHOULDER_WAIST_IDEAL} markLabel="ideal" />
              <p className="kpi__note">
                {d.shoulderWaist >= SHOULDER_WAIST_IDEAL
                  ? "No ideal estético."
                  : `Faltam ${fmt2(SHOULDER_WAIST_IDEAL - d.shoulderWaist)} para o ideal: menos cintura, mais ombro.`}
              </p>
            </>
          ) : (
            <p className="text-ice-300">Precisa de ombros e cintura medidos.</p>
          )}
        </Card>

        <Card className="bento__whr kpi">
          <p className="eyebrow">Cintura / altura</p>
          {d.waistHeight ? (
            <>
              <p className="kpi__value">
                <span className="num">{fmt2(d.waistHeight)}</span>
              </p>
              <RatioMeter value={d.waistHeight} min={0.4} max={0.6} mark={WAIST_HEIGHT_HEALTHY} markLabel="limite" goodBelow />
              <p className="kpi__note">
                {d.waistHeight < WAIST_HEIGHT_HEALTHY
                  ? `Zona saudável (abaixo de ${fmt2(WAIST_HEIGHT_HEALTHY)}).`
                  : `Acima de ${fmt2(WAIST_HEIGHT_HEALTHY)}: o objetivo é descer a cintura.`}
              </p>
            </>
          ) : (
            <p className="text-ice-300">Precisa da cintura e da altura do perfil.</p>
          )}
        </Card>

        <RoutineCard />
      </div>
    </div>
  );
}

function CheckInCard({ d }: { d: DashboardData }) {
  const c = d.checkIn;
  const since = d.due.daysSinceWeekly;
  return (
    <Card className="bento__checkin grid content-start gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Próximo check-in</p>
        <CalendarClock className="size-5 text-cobalt-300" aria-hidden="true" />
      </div>
      {c ? (
        c.daysLeft > 0 ? (
          <p>
            <span className="num font-display text-4xl font-medium">{c.daysLeft}</span>{" "}
            <span className="text-ice-300">
              {c.daysLeft === 1 ? "dia" : "dias"} · {formatDayMonth(c.date)}
            </span>
          </p>
        ) : (
          <p className="font-display text-xl font-bold text-acid-400">Check-in disponível</p>
        )
      ) : (
        <p className="text-ice-300">Define uma meta para começar a contagem.</p>
      )}
      <div className="grid gap-2">
        <p className="text-sm font-medium">Hoje e esta semana:</p>
        <ul className="checklist">
          <li data-due={!d.due.weightToday}>
            Peso
            <span>{d.due.weightToday ? "feito hoje" : "por registar hoje"}</span>
          </li>
          <li data-due={!d.due.waistToday}>
            Cintura
            <span>{d.due.waistToday ? "feito hoje" : "por medir hoje"}</span>
          </li>
          <li data-due={d.due.weekly}>
            Braço, peito, ombros
            <span>
              {d.due.weekly
                ? "por medir esta semana"
                : since === 0
                  ? "feito hoje"
                  : `feito há ${since} ${since === 1 ? "dia" : "dias"}`}
            </span>
          </li>
        </ul>
      </div>
      {c && c.daysLeft <= 0 ? (
        <ButtonLink href="/metas" variant="acid" className="justify-self-start">
          Ver recomendação <ArrowRight />
        </ButtonLink>
      ) : (
        <ButtonLink href="/registar" variant="secondary" className="justify-self-start">
          Registar hoje <ArrowRight />
        </ButtonLink>
      )}
    </Card>
  );
}

function TodayTraining({ d }: { d: DashboardData }) {
  const t = d.training;
  return (
    <Card className="bento__training grid content-start gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Treino de hoje · {WEEKDAYS[d.weekday]}</p>
        <Dumbbell className="size-5 text-cobalt-300" aria-hidden="true" />
      </div>
      {t ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl">{t.title}</h2>
            <TypeBadge type={t.type} />
          </div>
          {t.notes && <p className="text-ice-300">{t.notes}</p>}
          {t.exercises.length > 0 ? (
            <ol className="exercise-list">
              {t.exercises.map((e, i) => (
                <li key={e.id}>
                  <span className="exercise-list__n num">{i + 1}</span>
                  <span className="font-medium">{e.name}</span>
                  <span className="num ml-auto text-sm text-ice-300">
                    {[e.sets && `${e.sets} ×`, e.reps].filter(Boolean).join(" ")}
                    {e.toFailure && <span className="text-acid-400"> · até à falha</span>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ice-300">
              {t.type === "descanso" ? "Dia de descanso: recupera, dorme bem." : "Ainda sem exercícios para este dia."}
            </p>
          )}
          <ButtonLink href="/treino" variant="ghost" className="justify-self-start">
            Ver plano semanal <ArrowRight />
          </ButtonLink>
        </>
      ) : (
        <p className="text-ice-300">Sem plano para hoje.</p>
      )}
    </Card>
  );
}

function RoutineCard() {
  const items = [
    "Pesar e medir a cintura todas as manhãs (a app faz as médias de 7 dias)",
    "Braço, peito e ombros 1× por semana",
    "Treino intenso: última série dos isolados até à falha",
    "Creatina todos os dias",
    "Dormir 7 a 9 horas",
  ];
  return (
    <Card className="bento__routine grid content-start gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Rotina</p>
        <ListChecks className="size-5 text-cobalt-300" aria-hidden="true" />
      </div>
      <ul className="routine">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </Card>
  );
}

function PainelSkeleton() {
  return (
    <div aria-busy="true" aria-label="A carregar o painel">
      <div className="grid gap-3 pb-8 pt-2">
        <Skeleton width={180} height={12} />
        <Skeleton width={320} height={40} radius={10} />
      </div>
      <div className="bento">
        {["waist", "weight", "checkin", "training", "macros", "arm"].map((k) => (
          <Card key={k} className={`bento__${k} grid content-start gap-3 p-6`} spotlight={false}>
            <Skeleton width="40%" height={12} />
            <Skeleton width="60%" height={44} radius={10} />
            <Skeleton height={12} />
          </Card>
        ))}
      </div>
    </div>
  );
}
