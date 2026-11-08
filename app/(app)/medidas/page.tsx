import type { Metadata } from "next";
import { PagePending } from "@/components/ui/page-pending";

export const metadata: Metadata = { title: "Medidas · RECOMP" };

export default function Page() {
  return (
    <PagePending
      title="Medidas"
      phase={4}
      summary="Registo semanal, pesagem diária e histórico com editar e apagar."
    />
  );
}
