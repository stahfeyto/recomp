"use client";

import { useActionState } from "react";
import { saveDailyWeight, type SaveDailyWeightState } from "@/app/(app)/medidas/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { haptic } from "@/lib/haptics";
import { formatDecimal } from "@/lib/number";

const initial: SaveDailyWeightState = { status: "idle", nonce: 0 };

/** Formulário curto de pesagem diária (usado no cartão de /medidas e no botão "+ Registar"). */
export function DailyWeightForm({
  today,
  defaultWeight,
  onDone,
}: {
  today: string;
  defaultWeight?: number;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [state, action, pending] = useActionState(
    async (prev: SaveDailyWeightState, formData: FormData) => {
      const res = await saveDailyWeight(prev, formData);
      if (res.status === "ok") {
        haptic(15);
        toast({ variant: "success", title: res.message ?? "Pesagem guardada" });
        onDone();
      } else if (res.errors?.form) {
        toast({ variant: "error", title: res.errors.form });
      }
      return res;
    },
    initial,
  );

  const errors = state.status === "error" ? state.errors : undefined;

  return (
    <form action={action} className="grid gap-4" noValidate>
      <TextField
        label="Peso"
        name="weightKg"
        unit="kg"
        size="xl"
        decimal
        autoFocus
        defaultValue={
          defaultWeight !== undefined ? formatDecimal(defaultWeight, { maximumFractionDigits: 2 }) : ""
        }
        error={errors?.weightKg}
      />
      <TextField label="Data" name="date" type="date" defaultValue={today} max={today} error={errors?.date} />
      <Button type="submit" variant="primary" size="lg" block loading={pending}>
        {pending ? "A guardar…" : "Guardar pesagem"}
      </Button>
    </form>
  );
}
