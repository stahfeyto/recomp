import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  LONG_SESSION_SECONDS,
  SESSION_COOKIE,
  SHORT_SESSION_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./jwt";

/** Cria a sessão e grava o cookie httpOnly. */
export async function createSession(subject: string, remember: boolean) {
  const maxAge = remember ? LONG_SESSION_SECONDS : SHORT_SESSION_SECONDS;
  const token = await signSessionToken(subject, maxAge);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Sem "manter sessão": cookie de sessão (desaparece ao fechar o browser).
    ...(remember ? { maxAge } : {}),
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/**
 * Para usar no início de TODAS as Server Actions e Route Handlers:
 * o proxy é só uma verificação otimista, a autorização real é aqui.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
