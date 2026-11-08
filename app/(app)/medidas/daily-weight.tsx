"use client";

import { Plus, Scale, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { DailyWeightForm } from "@/components/forms/daily-weight-form";
import { useToast } from "@/components/ui/toast";
import type { DailyWeightRow } from "@/lib/data/measurements";
import { formatDayMonth } from "@/lib/format";
import { formatDecimal } from "@/lib/number";
import { deleteDailyWeight, restoreDailyWeight } from "./actions";

/** Cartão "Pesagem diária": média de 7 dias, últimas pesagens e registo rápido. */
export function DailyWeightCard({
  today,
  weekly,
  todayWeight,
  recent,
}: {
  today: string;
  weekly: { average: number; count: number } | null;
  todayWeight: DailyWeightRow | null;
  recent: DailyWeightRow[];
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  function remove(row: DailyWeightRow) {
    startTransition(async () => {
      const deleted = await deleteDailyWeight(row.id);
      if (!deleted) return;
      toast({
        variant: "info",
        title: `Pesagem de ${formatDayMonth(deleted.date)} apagada`,
        action: {
          label: "Anular",
          onClick: () =>
            startTransition(async () => {
              const ok = await restoreDailyWeight(deleted);
              toast(ok ? { variant: "success", title: "Pesagem reposta" } : { variant: "error", title: "Não foi possível repor" });
            }),
        },
      });
    });
  }

  return (
    <Card className="grid content-start gap-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <p className="eyebrow">Pesagem diária</p>
          <h2 className="text-lg">Média dos últimos 7 dias</h2>
        </div>
        <Scale className="size-6 text-cobalt-300" aria-hidden="true" />
      </div>

      {weekly ? (
        <p className="num font-display text-5xl font-medium leading-none">
          {formatDecimal(weekly.average, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
          <span className="ml-2 text-xl text-ice-300">kg</span>
        </p>
      ) : (
        <p className="text-ice-300">Ainda sem pesagens esta semana. Pesa-te de manhã, depois da casa de banho.</p>
      )}
      {weekly && (
        <p className="-mt-2 text-sm text-ice-300">
          {weekly.count} {weekly.count === 1 ? "pesagem" : "pesagens"} nos últimos 7 dias
        </p>
      )}

      <Button variant={todayWeight ? "secondary" : "primary"} onClick={() => setOpen(true)}>
        <Plus /> {todayWeight ? `Hoje: ${formatDecimal(todayWeight.weightKg)} kg · alterar` : "Registar pesagem de hoje"}
      </Button>

      {recent.length > 0 && (
        <ul className="grid gap-1" aria-label="Últimas pesagens">
          {recent.slice(0, 7).map((w) => (
            <li key={w.id} className="flex items-center gap-3 rounded-lg py-1 pl-1">
              <span className="w-20 text-sm text-ice-300">{formatDayMonth(w.date)}</span>
              <span className="num font-medium">{formatDecimal(w.weightKg)} kg</span>
              <Button
                variant="ghost"
                icon
                className="ml-auto"
                aria-label={`Apagar pesagem de ${formatDayMonth(w.date)}`}
                onClick={() => remove(w)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Pesagem diária" size="sm"
        description="De manhã, em jejum. A app faz a média semanal.">
        <DailyWeightForm today={today} defaultWeight={todayWeight?.weightKg} onDone={() => setOpen(false)} />
      </Dialog>
    </Card>
  );
}
