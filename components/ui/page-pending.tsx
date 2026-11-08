import { Card } from "./card";
import { PageHeader } from "./page-header";

/** Página provisória até a fase correspondente estar feita. */
export function PagePending({
  title,
  phase,
  summary,
}: {
  title: string;
  phase: number;
  summary: string;
}) {
  return (
    <div className="stagger">
      <PageHeader eyebrow={`Fase ${phase}`} title={title} description={summary} />
      <Card className="grid min-h-48 place-items-center p-8 text-center">
        <p className="text-ice-300">Esta página é construída na fase {phase}.</p>
      </Card>
    </div>
  );
}
