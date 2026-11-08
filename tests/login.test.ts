/**
 * Fluxo de login a sério: a ação de login corre contra um Postgres em memória
 * (PGlite) com as migrações aplicadas. Só os cookies e os headers do Next são
 * simulados. A password é de teste, gerada aqui.
 */
import bcrypt from "bcryptjs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
let ip = "203.0.113.10";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": ip }),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
}));

const PASSWORD = "password-de-teste-123";
type LoginModule = typeof import("@/app/(auth)/login/actions");
let login: LoginModule["login"];

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const initial: Parameters<LoginModule["login"]>[0] = { error: null, attempt: 0, username: "" };

beforeAll(async () => {
  process.env.DATABASE_URL = "pglite:memory://";
  process.env.AUTH_SECRET = "segredo-de-teste-".repeat(4);
  process.env.ADMIN_USERNAME = "Helder Valente";
  process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash(PASSWORD, 4);

  const { getDb } = await import("@/db");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const db = await getDb();
  await migrate(db as unknown as Parameters<typeof migrate>[0], { migrationsFolder: "drizzle" });

  ({ login } = await import("@/app/(auth)/login/actions"));
});

beforeEach(() => {
  jar.clear();
});

describe("login", () => {
  it("credenciais certas → cria a sessão e devolve o destino", async () => {
    ip = "203.0.113.1";
    const res = await login(initial, form({ username: "Helder Valente", password: PASSWORD, remember: "on" }));
    expect(res.error).toBeNull();
    expect(res.redirectTo).toBe("/");

    const { SESSION_COOKIE, verifySessionToken } = await import("@/lib/jwt");
    const token = jar.get(SESSION_COOKIE);
    expect(token).toBeTruthy();
    expect(await verifySessionToken(token)).toEqual({ sub: "Helder Valente" });
  });

  it("password errada → mensagem genérica, sem sessão", async () => {
    ip = "203.0.113.2";
    const res = await login(initial, form({ username: "Helder Valente", password: "errada" }));
    expect(res.error).toBe("Credenciais inválidas");
    expect(res.redirectTo).toBeUndefined();
    expect(res.attempt).toBe(1);
    expect(res.username).toBe("Helder Valente");
    expect(jar.size).toBe(0);
  });

  it("utilizador errado → a mesma mensagem genérica", async () => {
    ip = "203.0.113.3";
    const res = await login(initial, form({ username: "helder valente", password: PASSWORD }));
    expect(res.error).toBe("Credenciais inválidas");
    expect(jar.size).toBe(0);
  });

  it("campos vazios → mensagem genérica", async () => {
    ip = "203.0.113.4";
    const res = await login(initial, form({ username: "", password: "" }));
    expect(res.error).toBe("Credenciais inválidas");
  });

  it("5 falhas → bloqueio de 1 minuto, mesmo com a password certa", async () => {
    ip = "203.0.113.5";
    let state: Parameters<LoginModule["login"]>[0] = { ...initial };
    for (let i = 1; i <= 4; i++) {
      state = { ...state, ...(await login(state, form({ username: "Helder Valente", password: `errada-${i}` }))) };
      expect(state.error).toBe("Credenciais inválidas");
    }
    const fifth = await login(state, form({ username: "Helder Valente", password: "errada-5" }));
    expect(fifth.error).toMatch(/Demasiadas tentativas: espera (5\d|60) s/);

    const blocked = await login(fifth, form({ username: "Helder Valente", password: PASSWORD }));
    expect(blocked.error).toMatch(/Tenta de novo dentro de (5\d|60) s/);
    expect(jar.size).toBe(0);
  });

  it("o bloqueio é por IP: outro IP continua a poder entrar", async () => {
    ip = "203.0.113.6";
    const res = await login(initial, form({ username: "Helder Valente", password: PASSWORD }));
    expect(res.redirectTo).toBe("/");
  });

  it("depois do bloqueio expirar, a password certa volta a funcionar e limpa as falhas", async () => {
    ip = "203.0.113.5";
    const { getDb, schema } = await import("@/db");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    await db
      .update(schema.loginAttempts)
      .set({ lockedUntil: new Date(Date.now() - 1000) })
      .where(eq(schema.loginAttempts.key, `ip:${ip}`));

    const res = await login(initial, form({ username: "Helder Valente", password: PASSWORD }));
    expect(res.redirectTo).toBe("/");
    const rows = await db.select().from(schema.loginAttempts).where(eq(schema.loginAttempts.key, `ip:${ip}`));
    expect(rows).toHaveLength(0);
  });

  it("só redireciona para caminhos internos", async () => {
    ip = "203.0.113.7";
    const ok = await login(initial, form({ username: "Helder Valente", password: PASSWORD, from: "/medidas" }));
    expect(ok.redirectTo).toBe("/medidas");
    const evil = await login(initial, form({ username: "Helder Valente", password: PASSWORD, from: "//evil.example" }));
    expect(evil.redirectTo).toBe("/");
    const abs = await login(initial, form({ username: "Helder Valente", password: PASSWORD, from: "https://evil.example" }));
    expect(abs.redirectTo).toBe("/");
  });
});

describe("rate limit (lógica pura)", () => {
  it("bloqueia à 5.ª falha e recomeça a contar depois do bloqueio", async () => {
    const { registerFailure, lockRemainingSeconds } = await import("@/lib/rate-limit");
    const t0 = new Date("2026-11-08T10:00:00Z");
    let s: ReturnType<typeof registerFailure> | null = null;
    for (let i = 0; i < 5; i++) s = registerFailure(s, t0);
    expect(s!.failedCount).toBe(5);
    expect(lockRemainingSeconds(s, t0)).toBe(60);

    const later = new Date(t0.getTime() + 61_000);
    expect(lockRemainingSeconds(s, later)).toBe(0);
    expect(registerFailure(s, later).failedCount).toBe(1);
  });

  it("falhas com mais de 15 minutos deixam de contar", async () => {
    const { registerFailure } = await import("@/lib/rate-limit");
    const t0 = new Date("2026-11-08T10:00:00Z");
    const s = registerFailure(registerFailure(null, t0), t0);
    expect(registerFailure(s, new Date(t0.getTime() + 16 * 60_000)).failedCount).toBe(1);
  });
});
