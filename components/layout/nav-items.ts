import { CirclePlus, Dumbbell, LayoutDashboard, Target, TrendingUp } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Painel", icon: LayoutDashboard, also: [] as string[] },
  // "Registar" fica ativo também no Histórico (/medidas), que se abre a partir daqui.
  { href: "/registar", label: "Registar", icon: CirclePlus, also: ["/medidas"] },
  { href: "/evolucao", label: "Evolução", icon: TrendingUp, also: [] },
  { href: "/metas", label: "Metas", icon: Target, also: [] },
  { href: "/treino", label: "Treino", icon: Dumbbell, also: [] },
] as const;

const matches = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function isActive(pathname: string, href: string): boolean {
  const item = NAV_ITEMS.find((i) => i.href === href);
  return matches(pathname, href) || (item?.also ?? []).some((h) => matches(pathname, h));
}
