import { ViewTransition, type ReactNode } from "react";

/**
 * Transição entre páginas (View Transitions API): ao navegar no dock para a direita
 * a página desliza para a esquerda, e ao contrário. Sem suporte do browser, a página
 * troca sem animação (fica a entrada escalonada de cada página). Os tipos de
 * transição vêm dos links do dock.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const map = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };
  return (
    <ViewTransition enter={map} exit={map} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
