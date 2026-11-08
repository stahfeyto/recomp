import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getGoalsPageData } from "@/lib/data/goals";
import { AssistantCard } from "./assistant-card";
import { GoalEditor } from "./goal-editor";
import { GoalsTimeline } from "./goals-timeline";
import "./metas.css";

export const metadata: Metadata = { title: "Metas · RECOMP" };

export default function MetasPage() {
  return (
    <div className="stagger">
      <PageHeader
        eyebrow="Nutrição"
        title="Metas"
        description="Calorias e macros, o assistente de check-in e o histórico de ajustes."
      />
      <Suspense fallback={<MetasSkeleton />}>
        <MetasContent />
      </Suspense>
    </div>
  );
}

async function MetasContent() {
  const d = await getGoalsPageData();
  return (
    <div className="grid gap-10">
      <AssistantCard rec={d.recommendation} active={d.active} today={d.today} />

      <section aria-labelledby="editor-h" className="grid gap-4">
        <h2 id="editor-h" className="text-xl">
          Editar metas
        </h2>
        <Card className="p-5 sm:p-6" spotlight={false}>
          <GoalEditor
            key={d.active?.id ?? "nova"}
            active={d.active}
            today={d.today}
            weightKg={d.weightKg}
          />
        </Card>
      </section>

      <section aria-labelledby="historico-metas-h" className="grid gap-4">
        <h2 id="historico-metas-h" className="text-xl">
          Histórico
        </h2>
        <GoalsTimeline goals={d.history} activeId={d.active?.id ?? null} today={d.today} />
      </section>
    </div>
  );
}

function MetasSkeleton() {
  return (
    <div className="grid gap-10" aria-busy="true" aria-label="A carregar metas">
      <Card className="grid gap-4 p-6" spotlight={false}>
        <Skeleton width="25%" height={12} />
        <Skeleton width="55%" height={28} radius={8} />
        <Skeleton height={14} />
      </Card>
      <Card className="grid gap-4 p-6" spotlight={false}>
        <Skeleton width={200} height={200} radius={999} />
        <Skeleton height={44} radius={12} />
        <Skeleton height={44} radius={12} />
      </Card>
    </div>
  );
}
