import { ArrowRight, Plus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, TextField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastDemo } from "./toast-demo";

// Pré-visualização do design system (fase 3). O Painel real substitui esta página na fase 5.
export default function Home() {
  return (
    <div className="stagger">
      <PageHeader
        eyebrow="Fase 3 · Design system"
        title="Painel"
        description="Componentes base do RECOMP. Esta página dá lugar ao painel real na fase 5."
        actions={
          <Button variant="primary">
            <Plus /> Registar
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-6">
        {/* Números em destaque */}
        <Card className="grid gap-3 p-6 md:col-span-4">
          <p className="eyebrow">Cintura</p>
          <p className="num font-display text-[clamp(2.75rem,8vw,4.5rem)] font-medium leading-none">
            83,5<span className="ml-2 text-2xl text-ice-300">cm</span>
          </p>
          <p className="text-sm text-success">−0,4 cm face à última medição</p>
        </Card>

        <Card className="grid content-start gap-4 p-6 md:col-span-2">
          <p className="eyebrow">Macros</p>
          <ul className="grid gap-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-protein" aria-hidden="true" />
              Proteína <span className="num ml-auto">160 g</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-carbs" aria-hidden="true" />
              Hidratos <span className="num ml-auto">250 g</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-fat" aria-hidden="true" />
              Gordura <span className="num ml-auto">62 g</span>
            </li>
          </ul>
        </Card>

        {/* Botões */}
        <Card className="grid content-start gap-4 p-6 md:col-span-3">
          <h2 className="text-lg">Botões</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Guardar medição</Button>
            <Button variant="secondary">Cancelar</Button>
            <Button variant="ghost">Ver histórico</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="acid">Aplicar às metas</Button>
            <Button variant="danger">Apagar</Button>
            <Button variant="primary" loading>
              A guardar…
            </Button>
          </div>
          <ButtonLink href="/medidas" variant="ghost" className="justify-self-start">
            Ir para Medidas <ArrowRight />
          </ButtonLink>
        </Card>

        {/* Campos */}
        <Card className="grid content-start gap-4 p-6 md:col-span-3">
          <h2 className="text-lg">Campos</h2>
          <TextField label="Cintura" unit="cm" size="xl" decimal placeholder="83,5" name="demo-waist" />
          <TextField
            label="Notas"
            name="demo-notes"
            placeholder="Medido de manhã, em jejum"
            hint="Aceita vírgula ou ponto nos números."
          />
          <TextField label="Peso" unit="kg" decimal name="demo-weight" defaultValue="abc" error="Escreve um número, por exemplo 65,4." />
          <Checkbox label="A força está a cair?" name="demo-strength" />
        </Card>

        {/* Toasts */}
        <Card className="grid content-start gap-4 p-6 md:col-span-3">
          <h2 className="text-lg">Notificações</h2>
          <ToastDemo />
        </Card>

        {/* Skeletons */}
        <Card className="grid content-start gap-3 p-6 md:col-span-3" aria-label="Exemplo de carregamento">
          <h2 className="text-lg">A carregar</h2>
          <Skeleton width="40%" height={14} />
          <Skeleton width="70%" height={40} radius={12} />
          <Skeleton height={14} />
        </Card>
      </div>
    </div>
  );
}
