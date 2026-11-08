"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Segunda metade da transição do login: o ecrã chega coberto de luz e ela "abre"
 * do centro para fora, revelando o Painel. Só corre logo a seguir ao login
 * (sessionStorage) e nunca com "reduzir movimento".
 */
export function LoginReveal() {
  const ref = useRef<HTMLDivElement>(null);

  // useLayoutEffect: a luz aparece antes do primeiro paint do Painel (sem "piscar").
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let entered = false;
    try {
      entered = sessionStorage.getItem("recomp:entered") === "1";
      sessionStorage.removeItem("recomp:entered");
    } catch {
      return;
    }
    // Remove a luz que o login deixou no ecrã.
    document.querySelectorAll(".login-light").forEach((n) => n.remove());
    if (!entered || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.hidden = false;
    const anim = el.animate([{ "--hole": "0%" }, { "--hole": "160%" }] as unknown as Keyframe[], {
      duration: 900,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards",
    });
    anim.finished.then(() => {
      el.hidden = true;
    }).catch(() => {
      el.hidden = true;
    });
    return () => anim.cancel();
  }, []);

  return <div ref={ref} className="login-reveal" hidden aria-hidden="true" />;
}
