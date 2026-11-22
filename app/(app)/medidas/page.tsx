import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getMeasurementsPageData } from "@/lib/data/measurements";
import { DailyWeightCard } from "./daily-weight";
import { MeasurementHistory } from "./history";
import "./medidas.css";

export const metadata: Metadata = { title: "Histórico · RECOMP" };

/** Histórico de medidas e pesagens, com editar e apagar. O registo diário está em /registar. */
export default function MedidasPage() {
  return (
    <div className="stagger">
      <PageHeader
        eyebrow="Medidas"
        title="Histórico"
        description="Todos os registos, do mais recente para o mais antigo. Toca no lápis para corrigir."
        actions={
          <ButtonLink href="/registar" variant="primary">
            <Plus /> Registar hoje
          </ButtonLink>
        }
      />
      <Suspense fallback={<MedidasSkeleton />}>
        <MedidasContent />
      </Suspense>
    </div>
  );
}

async function MedidasContent() {
  const data = await getMeasurementsPageData();
  return (
    <div className="grid gap-10">
      <section aria-labelledby="historico-h" className="grid gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="historico-h" className="text-xl">
            Medidas
          </h2>
          <p className="text-sm text-ice-300">
            {data.measurements.length} {data.measurements.length === 1 ? "registo" : "registos"}
          </p>
        </div>
        <MeasurementHistory rows={data.measurements} today={data.today} />
      </section>

      <DailyWeightCard
        today={data.today}
        weekly={data.weekly}
        todayWeight={data.todayWeight}
        recent={data.dailyWeights}
      />
    </div>
  );
}

function MedidasSkeleton() {
  return (
    <div className="grid gap-10" aria-busy="true" aria-label="A carregar o histórico">
      <div className="grid gap-4">
        <Skeleton width={160} height={24} />
        <Skeleton height={140} radius={20} />
        <Skeleton height={140} radius={20} />
      </div>
      <Card className="grid content-start gap-4 p-6" spotlight={false}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="60%" height={48} radius={12} />
      </Card>
    </div>
  );
}
