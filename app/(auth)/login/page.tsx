import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import "./login.css";

export const metadata: Metadata = { title: "Iniciar sessão · RECOMP" };

// A cena 3D (arco de luz, partículas, forma em cromado) chega na fase 9.
// Até lá, o arco é desenhado em CSS e serve também de fallback estático.
export default function LoginPage() {
  return (
    <main className="login-stage">
      <div className="login-arc" aria-hidden="true" />
      <div className="login-content">
        <h1 className="login-wordmark">RECOMP</h1>
        <p className="login-lead">Cintura a descer, braço a subir.</p>
        <Suspense fallback={<div className="glass glass--strong login-card login-card--placeholder" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
