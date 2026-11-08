/**
 * Lê um número escrito à portuguesa ou com ponto: "83,5", "83.5", " 83 ".
 * Devolve null se estiver vazio ou não for um número válido.
 */
export function parseDecimal(value: string | null | undefined): number | null {
  if (value == null) return null;
  const s = value.trim().replace(/\s/g, "").replace(",", ".");
  if (s === "" || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const nf1 = new Intl.NumberFormat("pt-PT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Formata para pt-PT com até 1 casa decimal: 83.5 → "83,5". */
export function formatDecimal(n: number, opts?: Intl.NumberFormatOptions): string {
  return opts ? new Intl.NumberFormat("pt-PT", opts).format(n) : nf1.format(n);
}
