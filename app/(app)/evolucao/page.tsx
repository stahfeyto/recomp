import type { Metadata } from "next";
import { PagePending } from "@/components/ui/page-pending";

export const metadata: Metadata = { title: "Evolução · RECOMP" };

export default function Page() {
  return (
    <PagePending
      title="Evolução"
      phase={6}
      summary="Gráficos de cada medida, cintura vs braço e o comparador Antes / Agora."
    />
  );
}
