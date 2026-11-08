"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/lib/use-hydrated";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal com animação de "layout partilhado": o painel cresce a partir do elemento
 * com o mesmo `layoutId` (ex.: o cartão do dia). O <dialog> nativo não serve aqui
 * (vive numa camada à parte e a animação não o acompanha), por isso: resto da
 * página `inert` enquanto está aberto, Esc fecha, foco entra no painel e volta
 * ao sítio de onde veio.
 */
export function LayoutModal({
  layoutId,
  open,
  onClose,
  labelledBy,
  children,
}: {
  layoutId: string;
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const others = Array.from(document.body.children).filter(
      (el) => el !== rootRef.current && !el.contains(rootRef.current),
    );
    others.forEach((el) => el.setAttribute("inert", ""));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco no primeiro campo do painel (depois de a animação começar).
    const t = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus({ preventScroll: true });
    }, 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      others.forEach((el) => el.removeAttribute("inert"));
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!hydrated) return null;

  return createPortal(
    <div ref={rootRef}>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              className="lmodal__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.div
              key="panel"
              ref={panelRef}
              layoutId={layoutId}
              className="lmodal glass glass--strong"
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelledBy}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <motion.div
                className="lmodal__content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
              >
                {children}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
