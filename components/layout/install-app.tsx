"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { haptic } from "@/lib/haptics";
import { useHydrated } from "@/lib/use-hydrated";

/** Evento do Chrome/Edge (Android e PC) que permite instalar a PWA com um toque. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type Phone = "ios" | "android" | null;

function phoneKind(): Phone {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

/**
 * Botão "Instalar" no cabeçalho: no Android (Chrome) e no PC abre o pedido de
 * instalação com um toque; se o browser ainda não o permitir, ou no iPhone (a
 * Apple não deixa instalar por código), mostra os passos. Desaparece quando a
 * app já está instalada.
 */
export function InstallApp() {
  const hydrated = useHydrated();
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Só depois da hidratação (o servidor não sabe o aparelho) e nunca dentro da app instalada.
  if (!hydrated || isStandalone()) return null;
  const phone: Phone = phoneKind();
  if (!prompt && !phone) return null;

  async function install() {
    if (!prompt) {
      setOpen(true);
      return;
    }
    haptic(8);
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
  }

  return (
    <>
      <button type="button" className="btn btn--lime btn--sm install-btn" onClick={install}>
        <Download aria-hidden="true" />
        <span>Instalar</span>
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={phone === "ios" ? "Instalar no iPhone" : "Instalar no telemóvel"}
        description="Dois toques e fica no ecrã principal, com o ícone do RECOMP."
        size="sm"
      >
        {phone === "ios" ? (
          <ol className="install-steps">
            <li>
              <span className="install-steps__n">1</span>
              <span>
                No Safari, carrega em <strong>Partilhar</strong> <Share aria-hidden="true" /> (o quadrado com a seta, em baixo).
              </span>
            </li>
            <li>
              <span className="install-steps__n">2</span>
              <span>
                Desce e escolhe <strong>Adicionar ao ecrã principal</strong> <SquarePlus aria-hidden="true" />, depois <strong>Adicionar</strong>.
              </span>
            </li>
          </ol>
        ) : (
          <ol className="install-steps">
            <li>
              <span className="install-steps__n">1</span>
              <span>
                No Chrome, carrega nos <strong>três pontos</strong> (canto superior direito).
              </span>
            </li>
            <li>
              <span className="install-steps__n">2</span>
              <span>
                Escolhe <strong>Instalar app</strong> ou <strong>Adicionar ao ecrã principal</strong> <SquarePlus aria-hidden="true" /> e confirma.
              </span>
            </li>
          </ol>
        )}
      </Dialog>
    </>
  );
}
