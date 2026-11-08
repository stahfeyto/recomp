"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus, Ruler, Scale } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { DailyWeightForm } from "@/components/forms/daily-weight-form";
import { Dialog } from "@/components/ui/dialog";

function todayInLisbon(): string {
  // en-CA dá o formato yyyy-MM-dd.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

/**
 * Botão flutuante "+ Registar" (todas as páginas exceto /medidas, que já tem o formulário):
 * abre um menu com "Medição semanal" e "Pesagem de hoje".
 */
export function RegisterFab() {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menu) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  if (pathname.startsWith("/medidas")) return null;

  return (
    <div ref={rootRef} className="fab">
      <AnimatePresence>
        {menu && (
          <motion.div
            id={menuId}
            className="fab__menu glass glass--strong"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <Link href="/medidas" className="btn btn--ghost btn--block fab__item" onClick={() => setMenu(false)}>
              <Ruler /> Medição semanal
            </Link>
            <button
              type="button"
              className="btn btn--ghost btn--block fab__item"
              onClick={() => {
                setMenu(false);
                setWeightOpen(true);
              }}
            >
              <Scale /> Pesagem de hoje
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        className="btn btn--primary btn--lg fab__button"
        aria-expanded={menu}
        aria-controls={menuId}
        onClick={() => setMenu((v) => !v)}
      >
        <Plus className="fab__plus" data-open={menu} /> Registar
      </button>

      <Dialog
        open={weightOpen}
        onClose={() => setWeightOpen(false)}
        title="Pesagem diária"
        description="De manhã, em jejum. A app faz a média semanal."
        size="sm"
      >
        {weightOpen && <DailyWeightForm today={todayInLisbon()} onDone={() => setWeightOpen(false)} />}
      </Dialog>
    </div>
  );
}
