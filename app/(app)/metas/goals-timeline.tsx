import { Card } from "@/components/ui/card";
import type { GoalsPageData } from "@/lib/data/goals";
import { formatDate } from "@/lib/format";

/** Histórico das metas: a mais recente primeiro, a que está em vigor destacada. */
export function GoalsTimeline({
  goals,
  activeId,
  today,
}: {
  goals: GoalsPageData["history"];
  activeId: number | null;
  today: string;
}) {
  if (goals.length === 0) {
    return <Card className="p-6 text-ice-300">Ainda não há metas guardadas.</Card>;
  }
  return (
    <ol className="timeline">
      {goals.map((g) => {
        const state = g.id === activeId ? "active" : g.effectiveFrom > today ? "future" : "past";
        return (
          <li key={g.id} className="timeline__item" data-state={state}>
            <span className="timeline__dot" aria-hidden="true" />
            <Card className="timeline__card" spotlight={false}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-base">{g.label}</h3>
                {state === "active" && <span className="timeline__badge timeline__badge--active">Em vigor</span>}
                {state === "future" && <span className="timeline__badge">Agendada</span>}
                {g.source === "assistente" && <span className="timeline__badge">Assistente</span>}
                <span className="ml-auto text-sm text-ice-300">desde {formatDate(g.effectiveFrom)}</span>
              </div>
              <p className="timeline__values num">
                <strong>{g.calories} kcal</strong>
                <span>
                  <span className="timeline__swatch" style={{ background: "var(--cobalt-400)" }} aria-hidden="true" />P {g.proteinG} g
                </span>
                <span>
                  <span className="timeline__swatch" style={{ background: "var(--acid-400)" }} aria-hidden="true" />H {g.carbsG} g
                </span>
                <span>
                  <span className="timeline__swatch" style={{ background: "var(--vermillion-500)" }} aria-hidden="true" />G {g.fatG} g
                </span>
              </p>
              {g.notes && <p className="text-sm text-ice-300">{g.notes}</p>}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
