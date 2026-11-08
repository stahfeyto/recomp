import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps<T extends ElementType> = {
  as?: T;
  /** Brilho que segue o cursor (desktop). Ligado por defeito. */
  spotlight?: boolean;
  strong?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentProps<T>, "as" | "className" | "children">;

/** Cartão em vidro: fundo translúcido, blur, borda de 1px em gradiente. */
export function Card<T extends ElementType = "div">({
  as,
  spotlight = true,
  strong,
  className,
  children,
  ...props
}: CardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      className={cn("glass", strong && "glass--strong", className)}
      data-spotlight={spotlight ? "" : undefined}
      {...props}
    >
      {children}
    </Tag>
  );
}
