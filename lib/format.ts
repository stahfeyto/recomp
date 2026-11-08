import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { formatDecimal } from "./number";

/** "8 nov." */
export function formatDayMonth(iso: string): string {
  return format(parseISO(iso), "d MMM", { locale: pt });
}

/** "8 nov. 2026" */
export function formatDate(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy", { locale: pt });
}

/** "domingo, 8 de novembro" */
export function formatDateWeekday(iso: string): string {
  return format(parseISO(iso), "EEEE, d 'de' MMMM", { locale: pt });
}

/** "83,5 cm" */
export function formatMeasure(value: number, unit: string): string {
  return `${formatDecimal(value)} ${unit}`;
}

/** "+0,4" / "−0,4" / "0" (sinal de menos tipográfico). */
export function formatSigned(delta: number): string {
  const r = Math.round(delta * 10) / 10;
  if (r === 0) return "0";
  return `${r > 0 ? "+" : "−"}${formatDecimal(Math.abs(r))}`;
}
