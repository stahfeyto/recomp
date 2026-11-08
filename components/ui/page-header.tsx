import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-2 sm:pb-8">
      <div className="grid gap-2">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-[clamp(1.75rem,5vw,2.75rem)]">{title}</h1>
        {description && <p className="max-w-xl text-ice-300">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
