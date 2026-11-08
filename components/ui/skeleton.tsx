import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/** Bloco de carregamento com shimmer (parado com "reduzir movimento"). */
export function Skeleton({
  className,
  width,
  height = 16,
  radius,
}: {
  className?: string;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: CSSProperties["borderRadius"];
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton", className)}
      style={{ width, height, borderRadius: radius }}
    />
  );
}
