import { logout } from "./actions/auth";

// Página provisória. O Painel real chega na fase 5; o menu com "Terminar sessão" na fase 3.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-display text-5xl font-bold tracking-[0.2em] sm:text-7xl">
        RECOMP
      </h1>
      <p className="max-w-md text-ice-300">
        Sessão iniciada. O painel chega na fase 5.
      </p>
      <form action={logout}>
        <button
          type="submit"
          className="min-h-11 rounded-xl border border-ice-100/20 px-5 text-ice-100 transition-colors hover:bg-ice-100/10"
        >
          Terminar sessão
        </button>
      </form>
    </main>
  );
}
