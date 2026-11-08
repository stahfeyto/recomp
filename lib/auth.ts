import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  lockRemainingSeconds,
  registerFailure,
  type AttemptState,
} from "./rate-limit";

/**
 * O loader de .env do Next.js expande "$", por isso no .env.local o hash vai escrito
 * com "\$". Na Vercel vai tal e qual. Aceitamos os dois formatos.
 */
export function normalizeBcryptHash(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/\\\$/g, "$");
}

function sameText(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// Hash de uma password aleatória, para comparar mesmo quando o utilizador está errado
// (o tempo de resposta não revela se o nome existe). Gerado uma vez por instância.
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash(randomBytes(32).toString("hex"), 12);
  return dummyHash;
}

/** Confirma utilizador + password contra as variáveis de ambiente. */
export async function checkCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USERNAME ?? "";
  const hash = normalizeBcryptHash(process.env.ADMIN_PASSWORD_HASH);
  if (!expectedUser || !hash) {
    throw new Error(
      "ADMIN_USERNAME ou ADMIN_PASSWORD_HASH em falta nas variáveis de ambiente.",
    );
  }
  const userOk = sameText(username, expectedUser);
  const passOk = await bcrypt.compare(
    password,
    userOk ? hash : await getDummyHash(),
  );
  return userOk && passOk;
}

async function readAttempts(key: string): Promise<AttemptState | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.loginAttempts)
    .where(eq(schema.loginAttempts.key, key))
    .limit(1);
  return row ?? null;
}

/** Segundos de bloqueio que restam para esta chave (IP). */
export async function getLockSeconds(key: string): Promise<number> {
  return lockRemainingSeconds(await readAttempts(key), new Date());
}

/** Regista uma falha; devolve os segundos de bloqueio resultantes. */
export async function recordFailure(key: string): Promise<number> {
  const now = new Date();
  const next = registerFailure(await readAttempts(key), now);
  const db = await getDb();
  await db
    .insert(schema.loginAttempts)
    .values({ key, ...next })
    .onConflictDoUpdate({ target: schema.loginAttempts.key, set: next });
  return lockRemainingSeconds(next, now);
}

export async function clearFailures(key: string): Promise<void> {
  const db = await getDb();
  await db
    .delete(schema.loginAttempts)
    .where(eq(schema.loginAttempts.key, key));
}
