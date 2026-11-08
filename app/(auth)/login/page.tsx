import type { Metadata } from "next";
import { Suspense } from "react";
import { Scene3D } from "@/components/3d/scene-3d";
import { LoginForm } from "./login-form";
import "./login.css";

export const metadata: Metadata = { title: "Iniciar sessão · RECOMP" };

// Cena 3D (nó em cromado, anel de luz, partículas) carregada só no browser e só em
// aparelhos que a aguentam; o arco em CSS é o fundo e o fallback estático.
export default function LoginPage() {
  return (
    <main className="login-stage">
      <div className="login-arc" aria-hidden="true" />
      <Scene3D variant="login" />
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
