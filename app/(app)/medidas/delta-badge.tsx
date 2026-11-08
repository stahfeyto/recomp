import { ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import type { Tone } from "@/lib/calculations";
import { cn } from "@/lib/cn";

const TONE_TEXT: Record<Tone, string> = {
  good: "bom",
  bad: "a vigiar",
  same: "igual (dentro do erro de medição)",
  neutral: "",
};

/** Variação com seta e cor: verde = bom para a recomposição, vermelho = mau. */
export function DeltaBadge({
  tone,
  delta,
  label,
  className,
}: {
  tone: Tone;
  delta: number;
  label: string;
  className?: string;
}) {
  const Icon = tone === "same" ? Equal : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("delta", `delta--${tone}`, className)}>
      <Icon aria-hidden="true" />
      <span>
        {label}
        {TONE_TEXT[tone] && <span className="sr-only"> ({TONE_TEXT[tone]})</span>}
      </span>
    </span>
  );
}
