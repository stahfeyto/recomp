import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getMeasurementsPageData } from "@/lib/data/measurements";
import { DailyWeightCard } from "./daily-weight";
import { MeasurementHistory } from "./history";
import { MeasurementForm } from "./measurement-form";
import "./medidas.css";

export const metadata: Metadata = { title: "Medidas · RECOMP" };

export default function MedidasPage() {
  return (
    <div className="stagger">
      <PageHeader
        eyebrow="Registo semanal"
        title="Medidas"
        description="Cintura 1× por semana, braços a cada 2 semanas. Aceita vírgula ou ponto."
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
      <div className="medidas-top">
        <Card className="p-5 sm:p-6" spotlight={false}>
          <h2 className="mb-5 text-lg">Novo registo</h2>
          <MeasurementForm today={data.today} lastValues={data.lastValues} />
        </Card>
        <DailyWeightCard
          today={data.today}
          weekly={data.weekly}
          todayWeight={data.todayWeight}
          recent={data.dailyWeights}
        />
      </div>

      <section aria-labelledby="historico-h" className="grid gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="historico-h" className="text-xl">
            Histórico
          </h2>
          <p className="text-sm text-ice-300">
            {data.measurements.length} {data.measurements.length === 1 ? "registo" : "registos"}
          </p>
        </div>
        <MeasurementHistory rows={data.measurements} today={data.today} />
      </section>
    </div>
  );
}

function MedidasSkeleton() {
  return (
    <div className="grid gap-10" aria-busy="true" aria-label="A carregar medidas">
      <div className="medidas-top">
        <Card className="grid gap-4 p-6" spotlight={false}>
          <Skeleton width="30%" height={20} />
          <Skeleton height={64} radius={14} />
          <Skeleton height={64} radius={14} />
          <Skeleton height={52} radius={14} />
        </Card>
        <Card className="grid content-start gap-4 p-6" spotlight={false}>
          <Skeleton width="40%" height={14} />
          <Skeleton width="60%" height={48} radius={12} />
          <Skeleton height={44} radius={14} />
        </Card>
      </div>
      <div className="grid gap-4">
        <Skeleton width={160} height={24} />
        <Skeleton height={140} radius={20} />
      </div>
    </div>
  );
}
