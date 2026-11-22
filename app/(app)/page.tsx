import { ArrowRight, Check, Dumbbell } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense, type CSSProperties } from "react";
import { ButtonLink } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StreakChip } from "@/components/ui/streak";
import { SHOULDER_WAIST_IDEAL, WAIST_HEIGHT_HEALTHY } from "@/lib/calculations";
import { getDashboardData, type DashboardData } from "@/lib/data/dashboard";
import { formatDateWeekday, formatDayMonth, formatSigned } from "@/lib/format";
import {
  RELIABILITY_LABEL,
  TREND_LABEL,
  toneOf,
  type AveragedSummary,
  type Comparison,
  type SlowSummary,
} from "@/lib/metrics";
import type { MeasureKey } from "@/lib/measures";
import { formatDecimal } from "@/lib/number";
import { WEEKDAYS } from "@/lib/training";
import { EnergyBar } from "./_painel/energy-bar";
import { HeroLine } from "./_painel/hero-line";
import { RatioMeter } from "./_painel/ratio-meter";
import { Sparkline } from "./_painel/sparkline";
import { TypeBadge } from "./treino/training-types";
import "./_painel/painel.css";

export const metadata: Metadata = { title: "Painel · RECOMP" };

const fmt1 = (n: number) => formatDecimal(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt2 = (n: number) => formatDecimal(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PainelPage() {
  return (
    <Suspense fallback={<PainelSkeleton />}>
      <Painel />
    </Suspense>
  );
}

/**
 * Painel em cartaz: a cintura em número gigante (é ela que decide), o peso ao
 * lado, o ritual de hoje em pílulas, as medidas da semana em colunas. Cartões só
 * nos blocos com ações (treino, metas). Todos os números vêm de lib/metrics.ts.
 */
async function Painel() {
  const d = await getDashboardData();

  return (
    <div className="stagger painel">
      <PageHeader eyebrow={formatDateWeekday(d.today)} title={`${d.greeting}, ${d.name}`} />
      <Hero d={d} />
      <Ritual d={d} />
      <Weekly d={d} />
      <div className="painel__pair">
        <TodayTraining d={d} />
        <Goals d={d} />
      </div>
      <Ratios d={d} />
      <RoutineSection />
    </div>
  );
}

/* ------------------------------------------------------------------ herói */

function Reliability({ s }: { s: AveragedSummary }) {
  const r = s.current.reliability;
  return r === "fiavel" ? (
    <span className="tag">média de 7 dias ({s.current.count})</span>
  ) : (
    <span className="tag" data-tone="outline">
      {RELIABILITY_LABEL[r]}
    </span>
  );
}

/** Variações de uma média de 7 dias, em pílulas com a cor certa. */
function Deltas({ s, k, unit }: { s: AveragedSummary; k: MeasureKey; unit: string }) {
  const items: Array<{ label: string; c: Comparison }> = [];
  if (s.previous) items.push({ label: "vs semana anterior", c: s.previous });
  if (s.sinceStart) items.push({ label: "desde o início", c: s.sinceStart });
  if (items.length === 0) return null;
  return (
    <ul className="deltas">
      {items.map(({ label, c }, i) => {
        const tone = toneOf(k, c.trend);
        return (
          <li key={label} className="deltas__item" data-tone={tone} style={{ "--i": i } as CSSProperties}>
            <DeltaBadge tone={tone} delta={c.delta} label={`${formatSigned(c.delta)} ${unit}`} />
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Hero({ d }: { d: DashboardData }) {
  const w = d.waist;
  const p = d.weight;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <span className="hero__ghost" aria-hidden="true">
        Cintura
      </span>
      <span className="liquid" aria-hidden="true" />

      <div className="hero__main">
        <p className="hero__label">
          <span id="hero-title">Cintura</span>
          {w && <Reliability s={w} />}
        </p>
        {w ? (
          <>
            <p className="hero__value">
              <CountUp value={w.current.value} decimals={1} className="num" />
              <span className="hero__unit">cm</span>
            </p>
            <Deltas s={w} k="waistCm" unit="cm" />
            {w.current.reliability !== "fiavel" && (
              <p className="hero__note">Mede a cintura todos os dias: com 4 medições em 7 dias a média fica fiável.</p>
            )}
          </>
        ) : (
          <p className="hero__empty">Sem registos ainda. Regista a cintura de hoje para a média começar.</p>
        )}
        <HeroLine average={d.waistSpark} daily={d.waistDaily} unit="cm" label="Cintura nas últimas 8 semanas: média de 7 dias e medições diárias" />
      </div>

      <aside className="hero__side" aria-label="Peso">
        <p className="hero__label">
          <span>Peso</span>
          {p && <Reliability s={p} />}
        </p>
        {p ? (
          <>
            <p className="hero__value hero__value--sm">
              <CountUp value={p.current.value} decimals={1} className="num" />
              <span className="hero__unit">kg</span>
            </p>
            <Deltas s={p} k="weightKg" unit="kg" />
          </>
        ) : (
          <p className="hero__empty">Sem pesagens ainda.</p>
        )}
        <Sparkline variant="mini" id="weight" label="Média de 7 dias do peso nas últimas 8 semanas" unit="kg" points={d.weightSpark} />
      </aside>
    </section>
  );
}

/* ------------------------------------------------------------------ hoje */

function Ritual({ d }: { d: DashboardData }) {
  const c = d.checkIn;
  const since = d.due.daysSinceWeekly;
  const items = [
    { key: "peso", label: "Peso", done: d.due.weightToday, meta: d.due.weightToday ? "feito hoje" : "por registar hoje" },
    { key: "cintura", label: "Cintura", done: d.due.waistToday, meta: d.due.waistToday ? "feito hoje" : "por medir hoje" },
    {
      key: "semanal",
      label: "Braço, peito, ombros",
      done: !d.due.weekly,
      meta: d.due.weekly
        ? "por medir esta semana"
        : since === 0
          ? "feito hoje"
          : `feito há ${since} ${since === 1 ? "dia" : "dias"}`,
    },
  ];
  const pending = items.filter((i) => !i.done).length;

  return (
    <section className="ritual" aria-labelledby="ritual-title">
      <header className="section-head">
        <h2 id="ritual-title">Hoje</h2>
        <p className="section-head__meta">
          {pending === 0 ? "Tudo feito. Amanhã de manhã outra vez." : pending === 1 ? "Falta uma coisa." : `Faltam ${pending} coisas.`}
        </p>
      </header>
      <div className="ritual__grid">
        <ol className="pills">
          {items.map((i, n) => (
            <li key={i.key} className="pill" data-state={i.done ? "done" : "todo"} style={{ "--i": n } as CSSProperties}>
              {i.done ? (
                <>
                  <span className="pill__label">{i.label}</span>
                  <span className="pill__meta">
                    <Check aria-hidden="true" /> {i.meta}
                  </span>
                </>
              ) : (
                <Link href="/registar" className="pill__link">
                  <span className="pill__label">{i.label}</span>
                  <span className="pill__meta">
                    {i.meta} <ArrowRight aria-hidden="true" />
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ol>

        <div className="checkin">
          <p className="hero__label">Próximo check-in</p>
          {c ? (
            c.daysLeft > 0 ? (
              <p className="checkin__value">
                <span className="num">{c.daysLeft}</span>{" "}
                <span className="checkin__unit">
                  {c.daysLeft === 1 ? "dia" : "dias"} · {formatDayMonth(c.date)}
                </span>
              </p>
            ) : (
              <p className="checkin__due">Check-in disponível</p>
            )
          ) : (
            <p className="hero__empty">Define uma meta para começar a contagem.</p>
          )}
          <StreakChip days={d.streak} />
          {c && c.daysLeft <= 0 ? (
            <ButtonLink href="/metas" variant="lime">
              Ver recomendação <ArrowRight />
            </ButtonLink>
          ) : (
            <ButtonLink href="/registar" variant="secondary">
              Registar hoje <ArrowRight />
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- semana */

function WeeklyStat({
  label,
  sub,
  k,
  s,
  extra,
}: {
  label: string;
  sub?: string;
  k: MeasureKey;
  s: SlowSummary | null;
  extra?: string | null;
}) {
  return (
    <div className="wstat">
      <p className="hero__label">
        <span>
          {label}
          {sub && <span className="wstat__sub"> · {sub}</span>}
        </span>
      </p>
      {s ? (
        <>
          <p className="wstat__value">
            <CountUp value={s.latest.value} decimals={1} className="num" />
            <span className="hero__unit">cm</span>
          </p>
          {s.vsLast && (
            <p className="wstat__delta">
              <DeltaBadge tone={toneOf(k, s.vsLast.trend)} delta={s.vsLast.delta} label={`${formatSigned(s.vsLast.delta)} cm`} />
              <span>vs {formatDayMonth(s.vsLast.previous.date)}</span>
            </p>
          )}
          <p className="wstat__note">
            {s.fourWeeks
              ? `4 semanas: ${TREND_LABEL[s.fourWeeks.trend]} (${formatSigned(s.fourWeeks.delta)} cm)`
              : "4 semanas: ainda sem dados suficientes."}
            {extra && <span className="block">{extra}</span>}
          </p>
        </>
      ) : (
        <p className="hero__empty">Sem registos ainda.</p>
      )}
    </div>
  );
}

function Weekly({ d }: { d: DashboardData }) {
  return (
    <section className="weekly" aria-labelledby="weekly-title">
      <header className="section-head">
        <h2 id="weekly-title">Semana</h2>
        <p className="section-head__meta">Braço, peito e ombros 1× por semana. A conclusão faz-se a 4 semanas.</p>
      </header>
      <div className="weekly__grid">
        <WeeklyStat
          label="Braço"
          sub="média D/E"
          k="armRightCm"
          s={d.arm}
          extra={
            d.armSides
              ? `D ${fmt1(d.armSides.right)} · E ${fmt1(d.armSides.left)} · diferença ${fmt1(Math.abs(d.armSides.right - d.armSides.left))} cm`
              : null
          }
        />
        <WeeklyStat label="Peito" k="chestCm" s={d.chest} />
        <WeeklyStat label="Ombros" k="shouldersCm" s={d.shoulders} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------- treino e metas */

function TodayTraining({ d }: { d: DashboardData }) {
  const t = d.training;
  return (
    <section className="training" aria-labelledby="training-title">
      <header className="section-head section-head--row">
        <h2 id="training-title">Treino de hoje</h2>
        <p className="section-head__meta">
          <Dumbbell aria-hidden="true" /> {WEEKDAYS[d.weekday]}
        </p>
      </header>
      {t ? (
        <div className="training__body">
          <div className="training__title">
            <p className="training__name">{t.title}</p>
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
                    {e.toFailure && <span className="text-lime-400"> · até à falha</span>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ice-300">
              {t.type === "descanso" ? "Dia de descanso: recupera, dorme bem." : "Ainda sem exercícios para este dia."}
            </p>
          )}
          <ButtonLink href="/treino" variant="secondary" className="justify-self-start">
            Ver plano semanal <ArrowRight />
          </ButtonLink>
        </div>
      ) : (
        <p className="hero__empty">Sem plano para hoje.</p>
      )}
    </section>
  );
}

function Goals({ d }: { d: DashboardData }) {
  return (
    <section className="goals" aria-labelledby="goals-title">
      <header className="section-head">
        <h2 id="goals-title">Metas</h2>
        <p className="section-head__meta">
          {d.activeGoal ? `${d.activeGoal.label} · em vigor desde ${formatDayMonth(d.activeGoal.effectiveFrom)}` : "sem meta ativa"}
        </p>
      </header>
      {d.activeGoal ? (
        <div className="training__body">
          <EnergyBar goal={d.activeGoal} weightKg={d.weight?.current.value ?? null} />
          <ButtonLink href="/metas" variant="secondary" className="justify-self-start">
            Ver metas e check-in <ArrowRight />
          </ButtonLink>
        </div>
      ) : (
        <p className="hero__empty">Ainda não há metas ativas.</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ proporções */

function Ratios({ d }: { d: DashboardData }) {
  return (
    <section aria-labelledby="ratios-title">
      <header className="section-head">
        <h2 id="ratios-title">Proporções</h2>
        <p className="section-head__meta">Ombros a dividir pela cintura, e cintura a dividir pela altura (sempre com a média de 7 dias da cintura).</p>
      </header>
      <div className="ratios">
        <div className="ratio">
          <p className="hero__label">Ombros / cintura</p>
          {d.shoulderWaist ? (
            <>
              <p className="ratio__value num">{fmt2(d.shoulderWaist)}</p>
              <RatioMeter value={d.shoulderWaist} min={1.2} max={1.7} mark={SHOULDER_WAIST_IDEAL} markLabel="ideal" />
              <p className="ratio__note">
                {d.shoulderWaist >= SHOULDER_WAIST_IDEAL
                  ? "No ideal estético."
                  : `Faltam ${fmt2(SHOULDER_WAIST_IDEAL - d.shoulderWaist)} para o ideal: menos cintura, mais ombro.`}
              </p>
            </>
          ) : (
            <p className="hero__empty">Precisa de ombros e cintura medidos.</p>
          )}
        </div>
        <div className="ratio">
          <p className="hero__label">Cintura / altura</p>
          {d.waistHeight ? (
            <>
              <p className="ratio__value num">{fmt2(d.waistHeight)}</p>
              <RatioMeter value={d.waistHeight} min={0.4} max={0.6} mark={WAIST_HEIGHT_HEALTHY} markLabel="limite" goodBelow />
              <p className="ratio__note">
                {d.waistHeight < WAIST_HEIGHT_HEALTHY
                  ? `Zona saudável (abaixo de ${fmt2(WAIST_HEIGHT_HEALTHY)}).`
                  : `Acima de ${fmt2(WAIST_HEIGHT_HEALTHY)}: o objetivo é descer a cintura.`}
              </p>
            </>
          ) : (
            <p className="hero__empty">Precisa da cintura e da altura do perfil.</p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- rotina */

function RoutineSection() {
  const items = [
    "Pesar e medir a cintura todas as manhãs (a app faz as médias de 7 dias)",
    "Braço, peito e ombros 1× por semana",
    "Treino intenso: última série dos isolados até à falha",
    "Creatina todos os dias",
    "Dormir 7 a 9 horas",
  ];
  return (
    <section aria-labelledby="routine-title">
      <header className="section-head">
        <h2 id="routine-title">Rotina</h2>
      </header>
      <ul className="routine">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------- skeleton */

function PainelSkeleton() {
  return (
    <div aria-busy="true" aria-label="A carregar o painel" className="painel">
      <div className="grid gap-3 pb-8 pt-2">
        <Skeleton width={180} height={12} />
        <Skeleton width={320} height={44} radius={10} />
      </div>
      <div className="grid gap-4">
        <Skeleton width="30%" height={14} />
        <Skeleton width="70%" height={110} radius={16} />
        <Skeleton width="60%" height={28} radius={999} />
        <Skeleton height={120} radius={16} />
      </div>
      <div className="grid gap-2 pt-10">
        <Skeleton height={64} radius={999} />
        <Skeleton height={64} radius={999} />
        <Skeleton height={64} radius={999} />
      </div>
    </div>
  );
}
