import { Flame } from "lucide-react";
import { cn } from "@/lib/cn";

/** "N dias seguidos" com registo. Aquece (lima) a partir de 3 dias. Nada a mostrar com 0. */
export function StreakChip({ days, className }: { days: number; className?: string }) {
  if (days < 1) return null;
  return (
    <span className={cn("streak", days >= 3 && "streak--hot", className)}>
      <Flame aria-hidden="true" />
      <span className="num">{days}</span> {days === 1 ? "dia seguido" : "dias seguidos"}
    </span>
  );
}
