import { TZDate } from "@date-fns/tz";
import { format, subMonths } from "date-fns";

/** Fuso de referência da app. A Vercel corre em UTC, por isso "hoje" é sempre calculado aqui. */
export const APP_TZ = "Europe/Lisbon";

/** Agora, no fuso de Lisboa. */
export function nowInLisbon(): TZDate {
  return TZDate.tz(APP_TZ);
}

/** Data de hoje em Lisboa, formato ISO "yyyy-MM-dd" (tipo `date` do Postgres). */
export function todayISO(): string {
  return format(nowInLisbon(), "yyyy-MM-dd");
}

/** Data ISO de há `months` meses (em Lisboa). */
export function monthsAgoISO(months: number): string {
  return format(subMonths(nowInLisbon(), months), "yyyy-MM-dd");
}

/** Dia da semana com segunda = 0 … domingo = 6 (convenção de training_days). */
export function weekdayMondayFirst(date: Date = nowInLisbon()): number {
  return (date.getDay() + 6) % 7;
}
