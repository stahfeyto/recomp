import type { Metadata } from "next";
import { PagePending } from "@/components/ui/page-pending";

export const metadata: Metadata = { title: "Treino · RECOMP" };

export default function Page() {
  return (
    <PagePending
      title="Treino"
      phase={8}
      summary="Plano semanal de segunda a domingo, com exercícios editáveis."
    />
  );
}
