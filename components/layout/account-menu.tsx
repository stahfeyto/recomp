"use client";

import { AnimatePresence, motion } from "motion/react";
import { LogOut, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { logout } from "@/app/actions/auth";

/** Menu da conta (canto superior direito) com "Terminar sessão". */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="account-menu">
      <button
        ref={buttonRef}
        type="button"
        className="btn btn--secondary btn--icon"
        aria-label="Menu da conta"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <UserRound />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            className="account-menu__panel glass glass--strong"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <p className="account-menu__who">
              <span className="eyebrow">Sessão iniciada</span>
              <span>Helder Valente</span>
            </p>
            <form action={logout}>
              <button type="submit" className="btn btn--ghost btn--block account-menu__item">
                <LogOut />
                Terminar sessão
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
