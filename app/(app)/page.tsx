import { ArrowRight, CalendarClock, Dumbbell, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SHOULDER_WAIST_IDEAL, WAIST_HEIGHT_HEALTHY } from "@/lib/calculations";
import { getDashboardData, type DashboardData } from "@/lib/data/dashboard";
import { formatDateWeekday, formatDayMonth } from "@/lib/format";
import { formatDecimal } from "@/lib/number";
import { TRAINING_TYPES, WEEKDAYS } from "@/lib/training";
import { KpiCard } from "./_painel/kpi-card";
import { MacroRings } from "./_painel/macro-rings";
import { RatioMeter } from "./_painel/ratio-meter";
import { Sparkline } from "./_painel/sparkline";
import "./_painel/painel.css";

export const metadata: Metadata = { title: "Painel · RECOMP" };

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
      <PageHeader eyebrow={formatDateWeekday(d.today)} title={`${d.greeting}, ${d.name}`} />

      <div className="bento">
        {/* Cintura: a medida que decide */}
        <KpiCard
          className="bento__waist"
          size="lg"
          label="Cintura"
          value={d.waist?.current.value ?? null}
          unit="cm"
          toneKey="waistCm"
          previous={d.waist?.previous?.value}
          first={d.waist?.first.value}
        >
          <Sparkline id="waist" label="Cintura nas últimas 8 semanas" unit="cm" points={d.waistSpark} />
        </KpiCard>

        <KpiCard
          className="bento__weight"
          size="lg"
          label={d.weight?.source === "media" ? "Peso · média de 7 dias" : "Peso"}
          value={d.weight?.current ?? null}
          unit="kg"
          toneKey="weightKg"
          previous={d.weight?.previous}
          first={d.weight?.first}
          note={
            d.weight?.source === "media"
              ? `${d.weight.count} ${d.weight.count === 1 ? "pesagem" : "pesagens"} nesta semana`
              : "Pesa-te todas as manhãs para teres a média semanal."
          }
        >
          <Sparkline id="weight" label="Peso nas últimas 8 semanas" unit="kg" points={d.weightSpark} />
        </KpiCard>

        <Card className="bento__macros grid content-start gap-4 p-6">
          <div className="grid gap-1">
            <p className="eyebrow">Metas · {d.activeGoal?.label ?? "sem meta"}</p>
            {d.activeGoal && (
              <span className="text-xs text-ice-300">em vigor desde {formatDayMonth(d.activeGoal.effectiveFrom)}</span>
            )}
          </div>
          {d.activeGoal ? (
            <MacroRings goal={d.activeGoal} weightKg={d.weight?.current ?? null} />
          ) : (
            <p className="text-ice-300">Ainda não há metas ativas.</p>
          )}
        </Card>

        <KpiCard
          className="bento__arm"
          label="Braço · média D/E"
          value={d.arm?.current.value ?? null}
          unit="cm"
          toneKey="armRightCm"
          previous={d.arm?.previous?.value}
          first={d.arm?.first.value}
          note={
            d.armSides
              ? `D ${formatDecimal(d.armSides.right)} · E ${formatDecimal(d.armSides.left)} · diferença ${formatDecimal(Math.abs(d.armSides.right - d.armSides.left))} cm`
              : undefined
          }
        />
        <KpiCard
          className="bento__chest"
          label="Peito"
          value={d.chest?.current.value ?? null}
          unit="cm"
          toneKey="chestCm"
          previous={d.chest?.previous?.value}
          first={d.chest?.first.value}
        />
        <KpiCard
          className="bento__shoulders"
          label="Ombros"
          value={d.shoulders?.current.value ?? null}
          unit="cm"
          toneKey="shouldersCm"
          previous={d.shoulders?.previous?.value}
          first={d.shoulders?.first.value}
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
              <RatioMeter
                value={d.waistHeight}
                min={0.4}
                max={0.6}
                mark={WAIST_HEIGHT_HEALTHY}
                markLabel="limite"
                goodBelow
              />
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

        <CheckInCard d={d} />
        <TodayTraining d={d} />
        <RoutineCard />
      </div>
    </div>
  );
}

function agoText(days: number): string {
  return days === 0 ? "feito hoje" : days === 1 ? "feito ontem" : `feito há ${days} dias`;
}

function CheckInCard({ d }: { d: DashboardData }) {
  const c = d.checkIn;
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
            <span className="text-ice-300">{c.daysLeft === 1 ? "dia" : "dias"} · {formatDayMonth(c.date)}</span>
          </p>
        ) : (
          <p className="font-display text-xl font-bold text-acid-400">Check-in disponível</p>
        )
      ) : (
        <p className="text-ice-300">Define uma meta para começar a contagem.</p>
      )}
      <div className="grid gap-2">
        <p className="text-sm font-medium">Esta semana mede:</p>
        <ul className="checklist">
          <li data-due={d.due.waist}>
            Cintura
            <span>{d.due.waist ? "por medir" : agoText(d.due.daysSinceWaist ?? 0)}</span>
          </li>
          <li data-due={d.due.arms}>
            Braços
            <span>
              {d.due.arms
                ? "por medir"
                : `daqui a ${14 - (d.due.daysSinceArms ?? 0)} dias`}
            </span>
          </li>
          <li data-due="false">
            Peso
            <span>todas as manhãs</span>
          </li>
        </ul>
      </div>
      <ButtonLink href="/medidas" variant="secondary" className="justify-self-start">
        Registar medidas <ArrowRight />
      </ButtonLink>
    </Card>
  );
}

function TodayTraining({ d }: { d: DashboardData }) {
  const t = d.training;
  const type = t ? TRAINING_TYPES[t.type] : null;
  return (
    <Card className="bento__training grid content-start gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Treino de hoje · {WEEKDAYS[d.weekday]}</p>
        <Dumbbell className="size-5 text-cobalt-300" aria-hidden="true" />
      </div>
      {t && type ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl">{t.title}</h2>
            <span className="type-badge" data-tone={type.tone}>
              {type.label}
            </span>
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
    "Pesar todas as manhãs (a app faz a média)",
    "Cintura 1× por semana, braços a cada 2 semanas",
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
        {["waist", "weight", "macros", "arm", "chest", "shoulders"].map((k) => (
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
