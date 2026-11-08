import { Dumbbell, LayoutDashboard, Ruler, Target, TrendingUp } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/medidas", label: "Medidas", icon: Ruler },
  { href: "/evolucao", label: "Evolução", icon: TrendingUp },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/treino", label: "Treino", icon: Dumbbell },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
