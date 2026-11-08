import { CircleDashed, Dumbbell, Moon, Puzzle, type LucideIcon } from "lucide-react";
import { TRAINING_TYPES, type TrainingType } from "@/lib/training";

export const TYPE_ICONS: Record<TrainingType, LucideIcon> = {
  treino: Dumbbell,
  acessorios: Puzzle,
  opcional: CircleDashed,
  descanso: Moon,
};

export const TYPE_ORDER: TrainingType[] = ["treino", "acessorios", "opcional", "descanso"];

export function TypeBadge({ type }: { type: TrainingType }) {
  const t = TRAINING_TYPES[type];
  const Icon = TYPE_ICONS[type];
  return (
    <span className="type-badge" data-tone={t.tone}>
      <Icon aria-hidden="true" />
      {t.label}
    </span>
  );
}

/** "3 × 8–12 · 90 s" */
export function exerciseSummary(e: { sets: number | null; reps: string | null; restSeconds: number | null }): string {
  const parts: string[] = [];
  if (e.sets && e.reps) parts.push(`${e.sets} × ${e.reps}`);
  else if (e.sets) parts.push(`${e.sets} séries`);
  else if (e.reps) parts.push(e.reps);
  if (e.restSeconds) parts.push(`${e.restSeconds} s`);
  return parts.join(" · ");
}
