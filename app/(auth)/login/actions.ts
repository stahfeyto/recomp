"use server";

import { headers } from "next/headers";
import { z } from "zod";
import {
  checkCredentials,
  clearFailures,
  getLockSeconds,
  recordFailure,
} from "@/lib/auth";
import { createSession } from "@/lib/session";

export type LoginState = {
  error: string | null;
  /** Muda a cada falha, para repetir a animação de "shake". */
  attempt: number;
  /** Devolvido para o campo não ficar vazio depois de uma falha. */
  username: string;
  /**
   * Sessão criada: para onde ir. O cliente toca a transição ("a luz abre o ecrã")
   * e só depois navega (por isso não se usa redirect() aqui).
   */
  redirectTo?: string;
};

const schema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
  remember: z.literal("on").optional(),
  from: z.string().optional(),
});

/** Só caminhos internos ("/medidas"), nunca URLs externos. */
function safeRedirect(from: string | undefined): string {
  if (!from || !from.startsWith("/") || from.startsWith("//") || from.startsWith("/\\")) {
    return "/";
  }
  return from;
}

async function clientKey(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconhecido";
  return `ip:${ip}`;
}

const GENERIC = "Credenciais inválidas";

export async function login(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const fail = (error: string): LoginState => ({
    error,
    attempt: prev.attempt + 1,
    username: String(formData.get("username") ?? "").slice(0, 100),
  });

  const parsed = schema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    remember: formData.get("remember") ?? undefined,
    from: formData.get("from") ?? undefined,
  });
  if (!parsed.success) return fail(GENERIC);

  const key = await clientKey();
  try {
    const locked = await getLockSeconds(key);
    if (locked > 0) {
      return fail(`Demasiadas tentativas. Tenta de novo dentro de ${locked} s.`);
    }

    const ok = await checkCredentials(
      parsed.data.username,
      parsed.data.password,
    );
    if (!ok) {
      const wait = await recordFailure(key);
      return fail(
        wait > 0
          ? `${GENERIC}. Demasiadas tentativas: espera ${wait} s.`
          : GENERIC,
      );
    }

    await clearFailures(key);
    await createSession(parsed.data.username, parsed.data.remember === "on");
  } catch (err) {
    console.error("[login]", err);
    return fail("Não foi possível iniciar sessão. Tenta de novo daqui a pouco.");
  }

  return {
    error: null,
    attempt: prev.attempt,
    username: "",
    redirectTo: safeRedirect(parsed.data.from),
  };
}
