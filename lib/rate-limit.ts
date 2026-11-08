/**
 * Limite de tentativas de login: 5 falhadas → espera de 1 minuto.
 * A lógica é pura (testável); o acesso à BD está em lib/auth.ts.
 */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MS = 60_000;
/** Falhas mais antigas do que isto deixam de contar. */
export const RESET_AFTER_MS = 15 * 60_000;

export type AttemptState = {
  failedCount: number;
  lockedUntil: Date | null;
  lastAttemptAt: Date;
};

/** Segundos que faltam de bloqueio (0 = pode tentar). */
export function lockRemainingSeconds(
  state: AttemptState | null | undefined,
  now: Date,
): number {
  if (!state?.lockedUntil) return 0;
  const ms = state.lockedUntil.getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

/** Novo estado depois de uma tentativa falhada. */
export function registerFailure(
  state: AttemptState | null | undefined,
  now: Date,
): AttemptState {
  const lockExpired =
    state?.lockedUntil != null && state.lockedUntil.getTime() <= now.getTime();
  const stale =
    state != null &&
    now.getTime() - state.lastAttemptAt.getTime() > RESET_AFTER_MS;

  const previous = !state || lockExpired || stale ? 0 : state.failedCount;
  const failedCount = previous + 1;

  return {
    failedCount,
    lockedUntil:
      failedCount >= MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + LOCK_MS)
        : null,
    lastAttemptAt: now,
  };
}
