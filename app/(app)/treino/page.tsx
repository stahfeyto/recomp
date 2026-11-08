import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getTrainingWeek } from "@/lib/data/training";
import { WeekView } from "./week-view";
import "./treino.css";

export const metadata: Metadata = { title: "Treino · RECOMP" };

export default function TreinoPage() {
  return (
    <div className="stagger">
      <PageHeader
        eyebrow="Plano semanal"
        title="Treino"
        description="Toca num dia para mudar o tipo, as notas e os exercícios."
      />
      <Suspense fallback={<TreinoSkeleton />}>
        <TreinoContent />
      </Suspense>
    </div>
  );
}

async function TreinoContent() {
  const { week, todayWeekday } = await getTrainingWeek();
  return <WeekView week={week} todayWeekday={todayWeekday} />;
}

function TreinoSkeleton() {
  return (
    <div className="week" aria-busy="true" aria-label="A carregar o plano">
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="day-card grid content-start gap-3 p-5" spotlight={false}>
          <Skeleton width="35%" height={12} />
          <Skeleton width="60%" height={24} radius={8} />
          <Skeleton width={90} height={22} radius={999} />
          <Skeleton height={14} />
        </Card>
      ))}
    </div>
  );
}
