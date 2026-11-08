"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Diálogo modal com o <dialog> nativo (foco preso, Esc fecha, fundo inerte).
 * No telemóvel abre como folha a subir de baixo; no desktop ao centro.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cn("dialog glass glass--strong", `dialog--${size}`)}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clique no fundo (fora do conteúdo) fecha.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="dialog__inner">
          <header className="dialog__header">
            <div className="grid gap-1">
              <h2 id={titleId} className="dialog__title">
                {title}
              </h2>
              {description && (
                <p id={descId} className="text-sm text-ice-300">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              aria-label="Fechar"
              onClick={onClose}
            >
              <X />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
