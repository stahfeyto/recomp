"use client";

import { useActionState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
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

export function LoginForm() {
  const from = useSearchParams().get("from") ?? "";
  const [state, action, pending] = useActionState(login, initial);
  const cardRef = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

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
