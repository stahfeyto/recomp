"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { NAV_ITEMS, isActive } from "./nav-items";

/**
 * Navegação principal: dock flutuante em vidro, em baixo no telemóvel,
 * barra lateral no desktop (≥ 1024px). O indicador desliza entre itens.
 */
export function Dock() {
  const pathname = usePathname();

  return (
    <nav className="dock glass glass--strong" aria-label="Navegação principal">
      <ul className="dock__list">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="dock__item">
              <Link
                href={href}
                className="dock__link"
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="dock-active"
                    className="dock__indicator"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    aria-hidden="true"
                  />
                )}
                <Icon className="dock__icon" aria-hidden="true" />
                <span className="dock__label">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
