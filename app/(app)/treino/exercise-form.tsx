"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { ExerciseRow } from "@/lib/data/training";
import { haptic } from "@/lib/haptics";
import { addExercise, updateExercise, type ExerciseInput } from "./actions";

function fromRow(e?: ExerciseRow): ExerciseInput {
  return {
    name: e?.name ?? "",
    sets: e?.sets != null ? String(e.sets) : "",
    reps: e?.reps ?? "",
    restSeconds: e?.restSeconds != null ? String(e.restSeconds) : "",
    toFailure: e?.toFailure ?? false,
    notes: e?.notes ?? "",
  };
}

/** Adicionar (com `dayId`) ou editar (com `exercise`) um exercício. */
export function ExerciseForm({
  dayId,
  exercise,
  onDone,
  idPrefix,
}: {
  dayId: number;
  exercise?: ExerciseRow;
  onDone?: () => void;
  idPrefix: string;
}) {
  const [v, setV] = useState<ExerciseInput>(() => fromRow(exercise));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const set = <K extends keyof ExerciseInput>(k: K, value: ExerciseInput[K]) =>
    setV((cur) => ({ ...cur, [k]: value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = exercise ? await updateExercise(exercise.id, v) : await addExercise(dayId, v);
      if (!res.ok) {
        setErrors(res.errors ?? {});
        return;
      }
      haptic(12);
      setErrors({});
      toast({ variant: "success", title: res.message ?? "Guardado" });
      if (!exercise) setV(fromRow());
      onDone?.();
    });
  }

  return (
    <form onSubmit={submit} className="exercise-form" noValidate>
      <TextField
        id={`${idPrefix}-name`}
        label="Exercício"
        value={v.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="Ex.: Supino inclinado com halteres"
        error={errors.name}
        className="exercise-form__name"
      />
      <TextField
        id={`${idPrefix}-sets`}
        label="Séries"
        inputMode="numeric"
        value={v.sets}
        onChange={(e) => set("sets", e.target.value.replace(/\D/g, ""))}
        placeholder="3"
        error={errors.sets}
      />
      <TextField
        id={`${idPrefix}-reps`}
        label="Repetições"
        value={v.reps}
        onChange={(e) => set("reps", e.target.value)}
        placeholder="8–12"
        error={errors.reps}
      />
      <TextField
        id={`${idPrefix}-rest`}
        label="Descanso"
        unit="s"
        inputMode="numeric"
        value={v.restSeconds}
        onChange={(e) => set("restSeconds", e.target.value.replace(/\D/g, ""))}
        placeholder="90"
        error={errors.restSeconds}
      />
      <Checkbox
        label="Última série até à falha"
        checked={v.toFailure}
        onChange={(e) => set("toFailure", e.target.checked)}
        className="exercise-form__failure"
      />
      <TextField
        id={`${idPrefix}-notes`}
        label="Notas (opcional)"
        value={v.notes}
        onChange={(e) => set("notes", e.target.value)}
        placeholder="Ex.: pega neutra, 2 s na descida"
        error={errors.notes}
        className="exercise-form__notes"
      />
      <div className="exercise-form__actions">
        {exercise && onDone && (
          <Button variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant={exercise ? "primary" : "secondary"} loading={pending}>
          {pending ? "A guardar…" : exercise ? "Guardar exercício" : "Adicionar exercício"}
        </Button>
      </div>
    </form>
  );
}
