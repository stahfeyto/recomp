import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "acid";
type Size = "sm" | "md" | "lg";

type StyleProps = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Botão só com ícone: obrigatório dar `aria-label`. */
  icon?: boolean;
};

function classes({ variant = "secondary", size = "md", block, icon }: StyleProps, extra?: string) {
  return cn(
    "btn",
    `btn--${variant}`,
    size !== "md" && `btn--${size}`,
    block && "btn--block",
    icon && "btn--icon",
    extra,
  );
}

export function Button({
  variant,
  size,
  block,
  icon,
  loading,
  className,
  children,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps & { loading?: boolean }) {
  return (
    <button
      type={type}
      className={classes({ variant, size, block, icon }, className)}
      aria-busy={loading || undefined}
      disabled={props.disabled || loading}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  block,
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & StyleProps & { children: ReactNode }) {
  return (
    <Link className={classes({ variant, size, block, icon }, className)} {...props}>
      {children}
    </Link>
  );
}
