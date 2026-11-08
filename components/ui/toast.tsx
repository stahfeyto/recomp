"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, CircleAlert, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type Variant = "success" | "error" | "info";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: Variant;
  /** Ex.: { label: "Anular", onClick: () => … } */
  action?: { label: string; onClick: () => void };
  /** ms; 0 = só fecha à mão. Por defeito 5 s (8 s com ação). */
  duration?: number;
};

type ToastItem = ToastOptions & { id: number };

type ToastApi = {
  toast: (opts: ToastOptions) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast tem de estar dentro de <ToastProvider>.");
  return ctx;
}

const ICONS = { success: Check, error: CircleAlert, info: Info } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: ToastOptions) => {
    const id = nextId.current++;
    // No máximo 3 visíveis: o mais antigo sai.
    setItems((list) => [...list.slice(-2), { ...opts, id }]);
    return id;
  }, []);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext value={api}>
      {children}
      <ol className="toast-region" aria-label="Notificações">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <ToastView key={t.id} item={t} dismiss={dismiss} />
          ))}
        </AnimatePresence>
      </ol>
    </ToastContext>
  );
}

function ToastView({ item, dismiss }: { item: ToastItem; dismiss: (id: number) => void }) {
  const { id } = item;
  const variant = item.variant ?? "info";
  const Icon = ICONS[variant];
  const duration = item.duration ?? (item.action ? 8000 : 5000);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!duration || paused) return;
    const t = window.setTimeout(() => dismiss(id), duration);
    return () => window.clearTimeout(t);
  }, [duration, paused, dismiss, id]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className={cn("toast glass glass--strong", `toast--${variant}`)}
      role={variant === "error" ? "alert" : "status"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="toast__icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="toast__body">
        <p className="toast__title">{item.title}</p>
        {item.description && <p className="toast__desc">{item.description}</p>}
      </div>
      {item.action && (
        <button
          type="button"
          className="btn btn--ghost btn--sm toast__action"
          onClick={() => {
            item.action!.onClick();
            dismiss(id);
          }}
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        className="btn btn--ghost btn--sm btn--icon toast__close"
        aria-label="Fechar notificação"
        onClick={() => dismiss(id)}
      >
        <X />
      </button>
    </motion.li>
  );
}
