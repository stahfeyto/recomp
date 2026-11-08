"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, TextField } from "@/components/ui/field";
import { login, type LoginState } from "./actions";

const initial: LoginState = { error: null, attempt: 0, username: "" };

const SHAKE: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-8px)" },
  { transform: "translateX(8px)" },
  { transform: "translateX(-6px)" },
  { transform: "translateX(6px)" },
  { transform: "translateX(-2px)" },
  { transform: "translateX(0)" },
];

/**
 * Transição depois do login: um círculo de luz azul nasce no cartão e enche o ecrã.
 * No Painel, o LoginReveal "abre" essa luz do centro para fora.
 */
async function playEnterLight(from: HTMLElement | null): Promise<void> {
  if (!from || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = from.getBoundingClientRect();
  const light = document.createElement("div");
  light.className = "login-light";
  light.style.left = `${r.left + r.width / 2}px`;
  light.style.top = `${r.top + r.height / 2}px`;
  document.body.appendChild(light);
  const cover = (Math.hypot(window.innerWidth, window.innerHeight) / 40) * 1.2;
  await light.animate(
    [
      { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0 },
      { transform: "translate(-50%, -50%) scale(2)", opacity: 1, offset: 0.25 },
      { transform: `translate(-50%, -50%) scale(${cover})`, opacity: 1 },
    ],
    { duration: 700, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" },
  ).finished;
}

export function LoginForm() {
  const from = useSearchParams().get("from") ?? "";
  const router = useRouter();
  const cardRef = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(async (prev: LoginState, fd: FormData) => {
    const res = await login(prev, fd);
    if (res.redirectTo) {
      await playEnterLight(cardRef.current);
      try {
        sessionStorage.setItem("recomp:entered", "1");
      } catch {
        // sem sessionStorage: o Painel aparece sem a transição
      }
      router.replace(res.redirectTo);
    }
    return res;
  }, initial);

  // A cada falha: o cartão abana e o foco volta à palavra-passe.
  useEffect(() => {
    if (state.attempt === 0 || !state.error) return;
    passwordRef.current?.focus();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cardRef.current?.animate(SHAKE, {
      duration: 420,
      easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)",
    });
  }, [state.attempt, state.error]);

  const invalid = state.error ? true : undefined;
  const describedBy = state.error ? "login-error" : undefined;

  return (
    <form ref={cardRef} action={action} className="glass glass--strong login-card" noValidate>
      <input type="hidden" name="from" value={from} />

      <TextField
        label="Nome de utilizador"
        name="username"
        autoComplete="username"
        autoCapitalize="words"
        spellCheck={false}
        required
        defaultValue={state.username}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />

      <TextField
        ref={passwordRef}
        label="Palavra-passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />

      <Checkbox label="Manter sessão iniciada" name="remember" defaultChecked />

      <p id="login-error" className="login-error" role="alert">
        {state.error}
      </p>

      <Button type="submit" variant="primary" size="lg" block loading={pending}>
        {pending ? "A entrar…" : "Iniciar sessão"}
      </Button>
    </form>
  );
}
