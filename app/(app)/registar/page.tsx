import { History } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getTodayData } from "@/lib/data/measurements";
import { MeasurementForm } from "../medidas/measurement-form";
import "../medidas/medidas.css";
import "./registar.css";
import { TodayForm } from "./today-form";

export const metadata: Metadata = { title: "Registar · RECOMP" };

export default function RegistarPage() {
  return (
    <div className="stagger">
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
    <div className="registar">
      <Card className="registar__card" spotlight={false}>
        <h2 className="registar__step">
          <span className="registar__step-n">1</span> Peso e cintura de hoje
        </h2>
        <TodayForm data={data} />
      </Card>

      <Card className="registar__card" spotlight={false}>
        <h2 className="registar__step">
          <span className="registar__step-n">2</span> Medidas completas
          <span className="registar__step-hint">1× por semana</span>
        </h2>
        <MeasurementForm today={data.today} lastValues={data.lastValues} />
      </Card>

      <ButtonLink href="/medidas" variant="ghost" className="justify-self-start">
        <History /> Ver histórico e editar registos
      </ButtonLink>
    </div>
  );
}

function RegistarSkeleton() {
  return (
    <div className="registar" aria-busy="true" aria-label="A carregar">
      <Card className="registar__card grid gap-4" spotlight={false}>
        <Skeleton width="50%" height={20} />
        <Skeleton height={64} radius={14} />
        <Skeleton height={64} radius={14} />
        <Skeleton height={52} radius={14} />
      </Card>
    </div>
  );
}
