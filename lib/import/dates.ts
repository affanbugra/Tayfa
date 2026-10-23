// Excel tarihlerini program yılına (Eylül 2026 – Ağustos 2027) oturtur.

const TR_MONTHS = [
  "ocak", "şubat", "mart", "nisan", "mayıs", "haziran",
  "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık",
];

export const PROGRAM_START_YEAR = 2026;

/** Ay ≥ 9 → 2026, ay ≤ 8 → 2027. */
export function programYearFor(month: number): number {
  return month >= 9 ? PROGRAM_START_YEAR : PROGRAM_START_YEAR + 1;
}

export function toIsoDate(year: number, month: number, day: number): string | null {
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Excel seri numarası (1900 sistemi) → {y, m, d}. */
export function excelSerialToParts(serial: number): { y: number; m: number; d: number } | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null;
  const ms = Math.round((Math.floor(serial) - 25569) * 86400000);
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = pazar, 6 = cumartesi
}

export function isWeekend(iso: string): boolean {
  const w = weekdayOf(iso);
  return w === 0 || w === 6;
}

export type SessionDateResult = {
  date: string | null;
  /** missing: tarih yok · suspicious: yıl düzeltildi ya da hafta sonuna düşmüyor · unparsed: okunamadı */
  issue: "missing" | "suspicious" | "unparsed" | null;
  raw: string | null;
};

/** Yoklama sütunundaki tarih hücresi (satır 8). */
export function parseSessionDate(value: unknown): SessionDateResult {
  const raw = value === null || value === undefined ? null : String(value).trim() || null;
  if (raw === null) return { date: null, issue: "missing", raw: null };

  let parts: { y: number | null; m: number; d: number } | null = null;
  if (typeof value === "number") {
    parts = excelSerialToParts(value);
  } else if (value instanceof Date) {
    parts = { y: value.getUTCFullYear(), m: value.getUTCMonth() + 1, d: value.getUTCDate() };
  } else {
    parts = parseTextDate(raw);
  }
  if (!parts) return { date: null, issue: "unparsed", raw };

  const year = programYearFor(parts.m);
  const date = toIsoDate(year, parts.m, parts.d);
  if (!date) return { date: null, issue: "unparsed", raw };
  const yearChanged = parts.y !== null && parts.y !== year;
  return { date, issue: yearChanged || !isWeekend(date) ? "suspicious" : null, raw };
}

/** "13 EKİM", "10 Ekim 2026", "10.10.2026", "10/10" */
function parseTextDate(text: string): { y: number | null; m: number; d: number } | null {
  const lower = text.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
  const named = lower.match(/^(\d{1,2})\s*([a-zçğıöşü]+)\.?(?:\s+(\d{4}))?/);
  if (named) {
    const m = TR_MONTHS.findIndex((name) => name.startsWith(named[2]) && named[2].length >= 3);
    if (m >= 0) return { d: Number(named[1]), m: m + 1, y: named[3] ? Number(named[3]) : null };
  }
  const numeric = lower.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
  if (numeric) {
    const y = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : null;
    return { d: Number(numeric[1]), m: Number(numeric[2]), y };
  }
  return null;
}

/** Doğum tarihi: Excel tarihi, "23.8.2011", "10/08/2011", "20.10 2011". Yıl düzeltmesi yapılmaz. */
export function parseBirthDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    const p = excelSerialToParts(value);
    return p ? toIsoDate(p.y, p.m, p.d) : null;
  }
  if (value instanceof Date) {
    return toIsoDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  const m = String(value).trim().match(/^(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./\s-]\s*(\d{4})$/);
  if (!m) return null;
  return toIsoDate(Number(m[3]), Number(m[2]), Number(m[1]));
}
