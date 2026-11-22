import { History } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StreakChip } from "@/components/ui/streak";
import { getTodayData } from "@/lib/data/measurements";
import { MeasurementForm } from "../medidas/measurement-form";
import "../medidas/medidas.css";
import "./registar.css";
import { TodayForm } from "./today-form";

export const metadata: Metadata = { title: "Registar · RECOMP" };

/**
 * Registar: um "mostrador" para o peso e a cintura (botões redondos ±, número
 * grande) e, por baixo de uma régua, as medidas completas da semana.
 */
export default function RegistarPage() {
  return (
    <div className="stagger registar">
      <PageHeader eyebrow="Registo" title="Registar hoje" description="Peso e cintura todas as manhãs. Braço, peito e ombros 1× por semana." />
      <Suspense fallback={<RegistarSkeleton />}>
        <RegistarContent />
      </Suspense>
    </div>
  );
}

async function RegistarContent() {
  const data = await getTodayData();
  return (
    <>
      <section className="dial" aria-labelledby="dial-title">
        <header className="section-head section-head--first section-head--row">
          <h2 id="dial-title">Peso e cintura</h2>
          <StreakChip days={data.streak} />
        </header>
        <TodayForm data={data} />
      </section>

      <section className="full" aria-labelledby="full-title">
        <header className="section-head">
          <h2 id="full-title">Medidas completas</h2>
          <p className="section-head__meta">1× por semana: braço, peito, ombros e extras.</p>
        </header>
        <MeasurementForm today={data.today} lastValues={data.lastValues} />
      </section>

      <ButtonLink href="/medidas" variant="ghost" className="registar__history">
        <History /> Ver histórico e editar registos
      </ButtonLink>
    </>
  );
}

function RegistarSkeleton() {
  return (
    <div className="dial" aria-busy="true" aria-label="A carregar">
      <Skeleton width="40%" height={28} radius={8} />
      <div className="grid gap-4">
        <Skeleton width="20%" height={18} />
        <Skeleton height={84} radius={24} />
        <Skeleton width="20%" height={18} />
        <Skeleton height={84} radius={24} />
        <Skeleton height={54} radius={16} />
      </div>
    </div>
  );
}
