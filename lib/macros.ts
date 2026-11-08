/** Macros: conversão para kcal (4/4/9) e redistribuição com calorias bloqueadas. */

export const KCAL_PER_G = { proteinG: 4, carbsG: 4, fatG: 9 } as const;
export type MacroKey = keyof typeof KCAL_PER_G;
export type Macros = Record<MacroKey, number>;

export const MACRO_KEYS: MacroKey[] = ["proteinG", "carbsG", "fatG"];

/** Calorias dos macros: proteína×4 + hidratos×4 + gordura×9. */
export function macroKcal(m: Macros): number {
  return m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9;
}

/** Diferença a partir da qual as calorias "não batem certo" com os macros. */
export const KCAL_MISMATCH = 30;

/**
 * Muda um macro mantendo as calorias totais: a diferença é tirada (ou dada) aos
 * outros dois, na proporção das calorias que cada um já tem. Nunca abaixo de 0 g.
 */
export function redistribute(
  current: Macros,
  key: MacroKey,
  grams: number,
  targetKcal: number,
): Macros {
  const next: Macros = { ...current, [key]: Math.max(0, Math.round(grams)) };
  const others = MACRO_KEYS.filter((k) => k !== key);
  const remaining = Math.max(0, targetKcal - next[key] * KCAL_PER_G[key]);
  const othersKcal = others.reduce((s, k) => s + current[k] * KCAL_PER_G[k], 0);

  for (const k of others) {
    const share = othersKcal > 0 ? (current[k] * KCAL_PER_G[k]) / othersKcal : 1 / others.length;
    next[k] = Math.max(0, Math.round((remaining * share) / KCAL_PER_G[k]));
  }
  return next;
}

/** Fatia de cada macro nas calorias dos macros (0–1). */
export function macroShares(m: Macros): Macros {
  const total = macroKcal(m) || 1;
  return {
    proteinG: (m.proteinG * 4) / total,
    carbsG: (m.carbsG * 4) / total,
    fatG: (m.fatG * 9) / total,
  };
}
