"use client";

import { motion } from "motion/react";
import { Flame } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LayoutModal } from "@/components/ui/layout-modal";
import type { TrainingDayRow } from "@/lib/data/training";
import { cn } from "@/lib/cn";
import { WEEKDAYS } from "@/lib/training";
import { DayEditor } from "./day-editor";
import { TypeBadge, exerciseSummary } from "./training-types";

/**
 * Semana de segunda a domingo. Telemóvel: faixa horizontal para deslizar, aberta no
 * dia de hoje, com atalhos por dia. Desktop: grelha. Cada cartão abre o editor do
 * dia num modal que cresce a partir do cartão.
 */
export function WeekView({ week, todayWeekday }: { week: TrainingDayRow[]; todayWeekday: number }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [visible, setVisible] = useState(todayWeekday);
  const stripRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useCallback(() => setOpenId(null), []);
  const openDay = week.find((d) => d.id === openId) ?? null;

  // Abre a faixa no dia de hoje (só desloca a faixa, nunca a página).
  useEffect(() => {
    const strip = stripRef.current;
    const card = strip?.querySelector<HTMLElement>(`[data-weekday="${todayWeekday}"]`);
    if (strip && card && strip.scrollWidth > strip.clientWidth) {
      strip.scrollLeft = card.offsetLeft - strip.offsetLeft - parseFloat(getComputedStyle(strip).paddingLeft || "0");
    }
  }, [todayWeekday]);

  // Atalho ativo = cartão mais visível na faixa.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setVisible(Number((e.target as HTMLElement).dataset.weekday));
        }
      },
      { root: strip, threshold: 0.6 },
    );
    strip.querySelectorAll("[data-weekday]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function jumpTo(weekday: number) {
    const strip = stripRef.current;
    const card = strip?.querySelector<HTMLElement>(`[data-weekday="${weekday}"]`);
    if (!strip || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({
      left: card.offsetLeft - strip.offsetLeft - parseFloat(getComputedStyle(strip).paddingLeft || "0"),
      behavior: reduce ? "auto" : "smooth",
    });
  }

  return (
    <>
      <nav className="week-chips" aria-label="Dias da semana">
        {week.map((d) => (
          <button
            key={d.id}
            type="button"
            className="week-chips__btn"
            aria-current={visible === d.weekday ? "true" : undefined}
            data-today={d.weekday === todayWeekday || undefined}
            onClick={() => jumpTo(d.weekday)}
          >
            {WEEKDAYS[d.weekday].slice(0, 3)}
          </button>
        ))}
      </nav>

      <motion.div ref={stripRef} className="week" layoutScroll>
        {week.map((d) => {
          const isToday = d.weekday === todayWeekday;
          return (
            <motion.div
              key={d.id}
              layoutId={`day-${d.id}`}
              className={cn("day-card glass", isToday && "day-card--today")}
              data-weekday={d.weekday}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <button
                type="button"
                className="day-card__btn"
                onClick={() => setOpenId(d.id)}
                aria-label={`Editar ${WEEKDAYS[d.weekday]}: ${d.title}`}
              >
                <div className="day-card__top">
                  <span className="eyebrow">{WEEKDAYS[d.weekday]}</span>
                  {isToday && <span className="day-card__today">Hoje</span>}
                </div>
                <h2 className="day-card__title">{d.title}</h2>
                <TypeBadge type={d.type} />
                {d.notes && <p className="text-sm text-ice-300">{d.notes}</p>}
                {d.exercises.length > 0 ? (
                  <ol className="day-card__list">
                    {d.exercises.map((e) => (
                      <li key={e.id}>
                        <span className="min-w-0 truncate">{e.name}</span>
                        <span className="day-card__meta num">
                          {exerciseSummary(e)}
                          {e.toFailure && <Flame aria-label="até à falha" />}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="day-card__empty">
                    {d.type === "descanso" ? "Recuperar, dormir bem." : "Toca para adicionar exercícios."}
                  </p>
                )}
              </button>
            </motion.div>
          );
        })}
      </motion.div>

      <LayoutModal layoutId={openDay ? `day-${openDay.id}` : "day-none"} open={openDay !== null} onClose={close} labelledBy={titleId}>
        {openDay && <DayEditor key={openDay.id} day={openDay} titleId={titleId} onClose={close} />}
      </LayoutModal>
    </>
  );
}
