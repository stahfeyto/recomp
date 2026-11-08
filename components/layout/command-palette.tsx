"use client";

import {
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Ruler,
  Scale,
  Search,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { logout } from "@/app/actions/auth";
import { DailyWeightForm } from "@/components/forms/daily-weight-form";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

type Command = {
  id: string;
  label: string;
  group: "Registar" | "Navegar" | "Conta";
  icon: LucideIcon;
  keywords?: string;
  run: () => void;
};

const OPEN_EVENT = "recomp:command-palette";

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function todayInLisbon(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

/** Botão no cabeçalho que abre a paleta (também abre com Ctrl/Cmd + K). */
export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      className="btn btn--secondary palette-trigger"
      aria-keyshortcuts="Control+K Meta+K"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      <Search aria-hidden="true" />
      <span className="palette-trigger__label">Procurar</span>
      <kbd className="palette-trigger__kbd">Ctrl K</kbd>
    </button>
  );
}

/** Paleta de comandos: registar, navegar, terminar sessão. Ctrl/Cmd + K. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  const commands = useMemo<Command[]>(
    () => [
      { id: "reg-medida", group: "Registar", icon: Ruler, label: "Registar medição semanal", keywords: "medidas cintura braço", run: () => router.push("/medidas") },
      { id: "reg-peso", group: "Registar", icon: Scale, label: "Registar pesagem de hoje", keywords: "peso balança", run: () => setWeightOpen(true) },
      { id: "nav-painel", group: "Navegar", icon: LayoutDashboard, label: "Ir para o Painel", keywords: "inicio home", run: () => router.push("/") },
      { id: "nav-medidas", group: "Navegar", icon: Ruler, label: "Ir para Medidas", keywords: "historico", run: () => router.push("/medidas") },
      { id: "nav-evolucao", group: "Navegar", icon: TrendingUp, label: "Ir para Evolução", keywords: "graficos comparador antes agora", run: () => router.push("/evolucao") },
      { id: "nav-metas", group: "Navegar", icon: Target, label: "Ir para Metas", keywords: "calorias macros check-in assistente", run: () => router.push("/metas") },
      { id: "nav-treino", group: "Navegar", icon: Dumbbell, label: "Ir para Treino", keywords: "plano exercicios", run: () => router.push("/treino") },
      { id: "logout", group: "Conta", icon: LogOut, label: "Terminar sessão", keywords: "sair logout", run: () => void logout() },
    ],
    [router],
  );

  const results = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (words.length === 0) return commands;
    return commands.filter((c) => {
      const hay = normalize(`${c.label} ${c.keywords ?? ""} ${c.group}`);
      return words.every((w) => hay.includes(w));
    });
  }, [commands, query]);

  const current = Math.min(active, Math.max(0, results.length - 1));

  function runCommand(c: Command) {
    close();
    // Deixa o diálogo fechar antes de navegar ou abrir outro.
    window.setTimeout(c.run, 0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((current + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((current - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter" && results[current]) {
      e.preventDefault();
      runCommand(results[current]);
    }
  }

  const optionId = (id: string) => `${listId}-${id}`;
  let lastGroup = "";

  return (
    <>
      <Dialog open={open} onClose={close} title="Comandos" size="md">
        <div className="palette">
          <div className="palette__search">
            <Search aria-hidden="true" />
            <input
              ref={inputRef}
              className="palette__input"
              placeholder="Escreve para procurar… (ex.: peso, metas)"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={results[current] ? optionId(results[current].id) : undefined}
              aria-label="Procurar comando"
              value={query}
              autoFocus
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
            />
          </div>
          <ul id={listId} role="listbox" aria-label="Comandos" className="palette__list">
            {results.length === 0 && <li className="palette__empty">Nenhum comando encontrado.</li>}
            {results.map((c, i) => {
              const header = c.group !== lastGroup ? c.group : null;
              lastGroup = c.group;
              const Icon = c.icon;
              return (
                <li key={c.id} role="presentation">
                  {header && (
                    <p className="palette__group" aria-hidden="true">
                      {header}
                    </p>
                  )}
                  <div
                    id={optionId(c.id)}
                    role="option"
                    aria-selected={i === current}
                    className={cn("palette__option", i === current && "is-active")}
                    onMouseMove={() => setActive(i)}
                    onClick={() => runCommand(c)}
                  >
                    <Icon aria-hidden="true" />
                    {c.label}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="palette__hint" aria-hidden="true">
            <kbd>↑</kbd> <kbd>↓</kbd> para escolher · <kbd>Enter</kbd> para abrir · <kbd>Esc</kbd> para fechar
          </p>
        </div>
      </Dialog>

      <Dialog
        open={weightOpen}
        onClose={() => setWeightOpen(false)}
        title="Pesagem diária"
        description="De manhã, em jejum. A app faz a média semanal."
        size="sm"
      >
        {weightOpen && <DailyWeightForm today={todayInLisbon()} onDone={() => setWeightOpen(false)} />}
      </Dialog>
    </>
  );
}
