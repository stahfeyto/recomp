/**
 * Assinatura e verificação do token de sessão (JWT HS256 com `jose`).
 * Sem dependências de servidor: usado tanto no proxy.ts como nas Server Actions.
 */
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "recomp_session";
/** "Manter sessão iniciada": 30 dias. */
export const LONG_SESSION_SECONDS = 60 * 60 * 24 * 30;
/** Sem "manter": cookie de sessão do browser, token válido 12 h. */
export const SHORT_SESSION_SECONDS = 60 * 60 * 12;

export type SessionPayload = { sub: string };

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET em falta ou com menos de 32 caracteres.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  subject: string,
  maxAgeSeconds: number,
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(secretKey());
}

/** Devolve o payload se o token for válido e não tiver expirado; senão `null`. */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return typeof payload.sub === "string" ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}
