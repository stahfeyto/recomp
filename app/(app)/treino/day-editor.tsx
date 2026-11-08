"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Flame, GripVertical, Pencil, Trash2, X } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { ExerciseRow, TrainingDayRow } from "@/lib/data/training";
import { haptic } from "@/lib/haptics";
import { TRAINING_TYPES, WEEKDAYS, type TrainingType } from "@/lib/training";
import { deleteExercise, reorderExercises, restoreExercise, updateDay } from "./actions";
import { ExerciseForm } from "./exercise-form";
import { TYPE_ICONS, TYPE_ORDER, exerciseSummary } from "./training-types";

/** Conteúdo do modal de edição de um dia. */
export function DayEditor({ day, titleId, onClose }: { day: TrainingDayRow; titleId: string; onClose: () => void }) {
  const [title, setTitle] = useState(day.title);
  const [type, setType] = useState<TrainingType>(day.type);
  const [notes, setNotes] = useState(day.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const uid = useId();

  function saveDay() {
    start(async () => {
      const res = await updateDay(day.id, { title, type, notes });
      if (!res.ok) {
        setErrors(res.errors ?? {});
        return;
      }
      setErrors({});
      haptic(12);
      toast({ variant: "success", title: res.message ?? "Dia guardado" });
    });
  }

  return (
    <div className="day-editor">
      <header className="day-editor__head">
        <h2 id={titleId} className="text-2xl">
          {WEEKDAYS[day.weekday]}
        </h2>
        <Button variant="ghost" icon aria-label="Fechar" onClick={onClose}>
          <X />
        </Button>
      </header>

      <section className="day-editor__section" aria-label="Dados do dia">
        <TextField
          id={`${uid}-title`}
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Push, Costas + Bíceps"
          error={errors.title}
        />
        <fieldset className="field">
          <legend className="field__label mb-1.5">Tipo de dia</legend>
          <div className="type-picker" role="radiogroup">
            {TYPE_ORDER.map((t) => {
              const Icon = TYPE_ICONS[t];
              return (
                <label key={t} data-tone={TRAINING_TYPES[t].tone}>
                  <input type="radio" name={`${uid}-type`} value={t} checked={type === t} onChange={() => setType(t)} />
                  <span>
                    <Icon aria-hidden="true" />
                    {TRAINING_TYPES[t].label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <TextField
          id={`${uid}-notes`}
          label="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: antebraço, trapézio, gémeos"
          error={errors.notes}
        />
        <Button variant="secondary" loading={pending} onClick={saveDay} className="justify-self-start">
          {pending ? "A guardar…" : "Guardar dia"}
        </Button>
      </section>

      <section className="day-editor__section" aria-labelledby={`${uid}-ex-h`}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 id={`${uid}-ex-h`} className="text-lg">
            Exercícios
          </h3>
          {day.exercises.length > 1 && (
            <span className="text-xs text-ice-300">Arrasta pela pega para reordenar</span>
          )}
        </div>
        {day.exercises.length > 0 ? (
          <SortableExercises
            key={day.exercises.map((e) => e.id).join(",")}
            dayId={day.id}
            exercises={day.exercises}
          />
        ) : (
          <p className="text-sm text-ice-300">Ainda sem exercícios neste dia.</p>
        )}
      </section>

      <section className="day-editor__section day-editor__add" aria-labelledby={`${uid}-add-h`}>
        <h3 id={`${uid}-add-h`} className="text-lg">
          Adicionar exercício
        </h3>
        <ExerciseForm dayId={day.id} idPrefix={`${uid}-new`} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------ lista ordenável */

const announcements = {
  onDragStart: ({ active }: { active: { data: { current?: { name?: string } } } }) =>
    `Pegaste em ${active.data.current?.name ?? "exercício"}.`,
  onDragOver: ({ active, over }: { active: { data: { current?: { name?: string } } }; over: { data: { current?: { index?: number } } } | null }) =>
    over ? `${active.data.current?.name ?? "Exercício"} está na posição ${(over.data.current?.index ?? 0) + 1}.` : undefined,
  onDragEnd: ({ active, over }: { active: { data: { current?: { name?: string } } }; over: { data: { current?: { index?: number } } } | null }) =>
    over
      ? `${active.data.current?.name ?? "Exercício"} largado na posição ${(over.data.current?.index ?? 0) + 1}.`
      : `${active.data.current?.name ?? "Exercício"} largado.`,
  onDragCancel: ({ active }: { active: { data: { current?: { name?: string } } } }) =>
    `Reordenação cancelada. ${active.data.current?.name ?? "Exercício"} voltou ao sítio.`,
};

function SortableExercises({ dayId, exercises }: { dayId: number; exercises: ExerciseRow[] }) {
  const [order, setOrder] = useState(() => exercises.map((e) => e.id));
  const [editing, setEditing] = useState<number | null>(null);
  const [, start] = useTransition();
  const { toast } = useToast();
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(Number(active.id)), order.indexOf(Number(over.id)));
    setOrder(next);
    haptic(8);
    start(async () => {
      const ok = await reorderExercises(dayId, next);
      if (!ok) toast({ variant: "error", title: "Não foi possível guardar a nova ordem" });
    });
  }

  function remove(e: ExerciseRow) {
    start(async () => {
      const deleted = await deleteExercise(e.id);
      if (!deleted) return;
      toast({
        variant: "info",
        title: `${deleted.name} apagado`,
        action: {
          label: "Anular",
          onClick: () =>
            start(async () => {
              const ok = await restoreExercise(deleted);
              toast(ok ? { variant: "success", title: "Exercício reposto" } : { variant: "error", title: "Não foi possível repor" });
            }),
        },
      });
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Para reordenar, carrega em Espaço ou Enter para pegar no exercício, usa as setas para cima e para baixo para o mover, e Espaço ou Enter para o largar. Escape cancela.",
        },
      }}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ol className="sortable">
          {order.map((id, index) => {
            const e = byId.get(id);
            if (!e) return null;
            return (
              <SortableItem key={id} exercise={e} index={index}>
                {editing === id ? (
                  <ExerciseForm dayId={dayId} exercise={e} idPrefix={`ex-${id}`} onDone={() => setEditing(null)} />
                ) : (
                  <div className="sortable__row">
                    <div className="sortable__body">
                      <p className="font-medium">
                        {e.name}
                        {e.toFailure && (
                          <span className="failure-tag">
                            <Flame aria-hidden="true" /> até à falha
                          </span>
                        )}
                      </p>
                      {(exerciseSummary(e) || e.notes) && (
                        <p className="text-sm text-ice-300">
                          {[exerciseSummary(e), e.notes].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" icon aria-label={`Editar ${e.name}`} onClick={() => setEditing(id)}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" icon aria-label={`Apagar ${e.name}`} onClick={() => remove(e)}>
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </SortableItem>
            );
          })}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  exercise,
  index,
  children,
}: {
  exercise: ExerciseRow;
  index: number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
    data: { name: exercise.name, index },
  });
  return (
    <li
      ref={setNodeRef}
      className="sortable__item"
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="sortable__handle"
        aria-label={`Reordenar ${exercise.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}
