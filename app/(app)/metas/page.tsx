import type { Metadata } from "next";
import { PagePending } from "@/components/ui/page-pending";

export const metadata: Metadata = { title: "Metas · RECOMP" };

export default function Page() {
  return (
    <PagePending
      title="Metas"
      phase={7}
      summary="Calorias e macros com histórico, e o assistente de check-in."
    />
  );
}
