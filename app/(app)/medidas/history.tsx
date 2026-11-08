"use client";

import { Pencil, Trash2, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deltaTone, lastKnownValues } from "@/lib/calculations";
import type { MeasurementRow } from "@/lib/data/measurements";
import { formatDate, formatSigned } from "@/lib/format";
import { MEASURES } from "@/lib/measures";
import { formatDecimal } from "@/lib/number";
import { deleteMeasurement, restoreMeasurement } from "./actions";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { MeasurementForm } from "./measurement-form";

/** Histórico dos registos semanais (mais recente primeiro), com editar e apagar. */
export function MeasurementHistory({
  rows,
  today,
}: {
  rows: MeasurementRow[];
  today: string;
}) {
  const [editing, setEditing] = useState<MeasurementRow | null>(null);
  const [confirming, setConfirming] = useState<MeasurementRow | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function confirmDelete(row: MeasurementRow) {
    startTransition(async () => {
      const deleted = await deleteMeasurement(row.id);
      setConfirming(null);
      if (!deleted) {
        toast({ variant: "error", title: "Este registo já não existe." });
        return;
      }
      toast({
        variant: "info",
        title: `Registo de ${formatDate(deleted.date)} apagado`,
        action: {
          label: "Anular",
          onClick: () =>
            startTransition(async () => {
              const ok = await restoreMeasurement(deleted);
              toast(
                ok
                  ? { variant: "success", title: "Registo reposto" }
                  : { variant: "error", title: "Não foi possível repor", description: "Já existe um registo nessa data." },
              );
            }),
        },
      });
    });
  }

  if (rows.length === 0) {
    return (
      <Card className="p-6 text-ice-300">
        Ainda não há registos. O primeiro fica guardado assim que gravares o formulário acima.
      </Card>
    );
  }

  return (
    <>
      <ol className="history">
        {rows.map((row) => {
          const previous = lastKnownValues(rows, { beforeDate: row.date });
          const shown = MEASURES.filter((m) => typeof row[m.key] === "number");
          return (
            <li key={row.id}>
              <Card as="article" className="history__item" aria-labelledby={`h-${row.id}`}>
                <header className="history__head">
                  <h3 id={`h-${row.id}`} className="history__date">
                    {formatDate(row.date)}
                  </h3>
                  {row.strengthDropping && (
                    <span className="history__flag">
                      <TriangleAlert aria-hidden="true" /> Força a cair
                    </span>
                  )}
                  <div className="ml-auto flex gap-1">
                    <Button variant="ghost" icon aria-label={`Editar registo de ${formatDate(row.date)}`} onClick={() => setEditing(row)}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" icon aria-label={`Apagar registo de ${formatDate(row.date)}`} onClick={() => setConfirming(row)}>
                      <Trash2 />
                    </Button>
                  </div>
                </header>

                <dl className="history__grid">
                  {shown.map((m) => {
                    const value = row[m.key] as number;
                    const prev = previous[m.key];
                    const delta = prev ? value - prev.value : null;
                    return (
                      <div key={m.key} className="history__cell">
                        <dt className="text-xs text-ice-300">{m.short}</dt>
                        <dd className="num text-lg font-medium">
                          {formatDecimal(value)} <span className="text-sm text-ice-300">{m.unit}</span>
                        </dd>
                        {delta !== null && (
                          <dd>
                            <DeltaBadge tone={deltaTone(m.key, delta)} delta={delta} label={`${formatSigned(delta)} ${m.unit}`} />
                          </dd>
                        )}
                      </div>
                    );
                  })}
                </dl>

                {row.notes && <p className="history__notes">{row.notes}</p>}
              </Card>
            </li>
          );
        })}
      </ol>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Editar ${formatDate(editing.date)}` : "Editar"}
        size="lg"
      >
        {editing && (
          <MeasurementForm
            key={editing.id}
            today={today}
            initial={editing}
            lastValues={lastKnownValues(rows, { excludeId: editing.id, beforeDate: editing.date })}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Apagar registo?"
        description={confirming ? `O registo de ${formatDate(confirming.date)} sai do histórico. Podes anular logo a seguir.` : undefined}
        size="sm"
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirming(null)}>
            Cancelar
          </Button>
          <Button variant="danger" loading={pending} onClick={() => confirming && confirmDelete(confirming)}>
            <Trash2 /> Apagar registo
          </Button>
        </div>
      </Dialog>
    </>
  );
}
