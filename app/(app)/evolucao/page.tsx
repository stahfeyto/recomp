import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getEvolutionData } from "@/lib/data/evolution";
import { Evolution } from "./evolution";
import "./evolucao.css";

export const metadata: Metadata = { title: "Evolução · RECOMP" };

export default function EvolucaoPage() {
  return (
    <div className="stagger">
      <PageHeader
        eyebrow="Gráficos"
        title="Evolução"
        description="Cintura e braço lado a lado, peso com média semanal, proporção e o comparador Antes / Agora."
      />
      <Suspense fallback={<EvolucaoSkeleton />}>
        <EvolucaoContent />
      </Suspense>
    </div>
  );
}

async function EvolucaoContent() {
  const data = await getEvolutionData();
  return <Evolution data={data} />;
}

function EvolucaoSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="A carregar gráficos">
      <Skeleton width={360} height={44} radius={14} />
      <Card className="grid gap-4 p-6" spotlight={false}>
        <Skeleton width="30%" height={22} />
        <Skeleton height={300} radius={12} />
      </Card>
      <div className="evo-pair">
        <Card className="grid gap-4 p-6" spotlight={false}>
          <Skeleton width="30%" height={22} />
          <Skeleton height={240} radius={12} />
        </Card>
        <Card className="grid gap-4 p-6" spotlight={false}>
          <Skeleton width="30%" height={22} />
          <Skeleton height={200} radius={12} />
        </Card>
      </div>
    </div>
  );
}
