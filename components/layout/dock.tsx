"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { haptic } from "@/lib/haptics";
import { NAV_ITEMS, isActive } from "./nav-items";

/**
 * Navegação principal: cápsula flutuante em baixo, ao centro (telemóvel e PC).
 * Ícones; o item ativo abre-se numa pílula lima com o nome, que desliza entre
 * itens com uma mola. No PC os nomes estão sempre à vista.
 */
export function Dock() {
  const pathname = usePathname();
  const currentIndex = NAV_ITEMS.findIndex((i) => isActive(pathname, i.href));

  return (
    <nav className="dock" aria-label="Navegação principal">
      <ul className="dock__list">
        {NAV_ITEMS.map(({ href, label, icon: Icon }, index) => {
          const active = isActive(pathname, href);
          // Direção da transição de página: item à direita = avançar, à esquerda = recuar.
          const direction = index > currentIndex ? "nav-forward" : "nav-back";
          return (
            <li key={href}>
              <Link
                href={href}
                className="dock__link"
                aria-current={active ? "page" : undefined}
                transitionTypes={active ? undefined : [direction]}
                onClick={() => haptic(6)}
              >
                {active && (
                  <motion.span
                    layoutId="dock-active"
                    className="dock__pill"
                    transition={{ type: "spring", stiffness: 480, damping: 38 }}
                    aria-hidden="true"
                  />
                )}
                <motion.span
                  className="dock__inner"
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 700, damping: 32 }}
                >
                  <Icon className="dock__icon" aria-hidden="true" />
                  <span className="dock__label">{label}</span>
                </motion.span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
