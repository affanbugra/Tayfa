// Tarih yardımcıları. Tüm tarihler Europe/Istanbul'a göre (CLAUDE.md §3).
import { format, parseISO } from "date-fns";
import { tr as trLocale } from "date-fns/locale";

export function todayIstanbul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

/** "11 Ekim 2026 Paz" */
export function formatDateTr(iso: string): string {
  return format(parseISO(iso), "d MMMM yyyy EEE", { locale: trLocale });
}

/** "11 Eki" */
export function formatDateShort(iso: string): string {
  return format(parseISO(iso), "d MMM", { locale: trLocale });
}

/** O tarihin bulunduğu hafta sonunun cumartesisi (pazar → bir önceki gün, hafta içi → önceki cumartesi). */
export function weekStartOf(iso: string): string {
  const d = parseISO(iso);
  const back = (d.getDay() + 1) % 7; // cumartesi 0, pazar 1, pazartesi 2 …
  d.setDate(d.getDate() - back);
  return format(d, "yyyy-MM-dd");
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return format(d, "yyyy-MM-dd");
}

/** "23 Ağustos 2011" (gün adı olmadan) */
export function formatDatePlain(iso: string): string {
  return format(parseISO(iso), "d MMMM yyyy", { locale: trLocale });
}
