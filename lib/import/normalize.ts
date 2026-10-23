// Metin, telefon, ad ve durum normalizasyonu. Saf fonksiyonlar; Türkçe büyük/küçük harf kurallarına uyar.

export type StudentStatus = "active" | "at_risk" | "removed";

/** Görünmez yön işaretleri, bölünmez boşluk vb. temizlenmiş, kırpılmış metin; boşsa null. */
export function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value)
    .replace(/[‎‏‪-‮⁦-⁩﻿]/g, "")
    .replace(/[   ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > 0 ? s : null;
}

/** Karşılaştırma anahtarı: tr küçük harf, noktalama yok, tek boşluk. */
export function normalizeKey(value: unknown): string {
  const s = cleanText(value);
  if (!s) return "";
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "MUHAMMET ALİ İDEKÇİ" / "haktan alim" → "Muhammet Ali İdekçi" / "Haktan Alim". */
export function toTitleCaseTr(value: unknown): string | null {
  const s = cleanText(value);
  if (!s) return null;
  return s
    .toLocaleLowerCase("tr")
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => (part ? part[0].toLocaleUpperCase("tr") + part.slice(1) : part))
        .join("-"),
    )
    .join(" ");
}

export type PhoneResult = {
  /** 10 haneli 5XXXXXXXXX ya da normalize edilemediyse temizlenmiş ham değer. */
  value: string | null;
  valid: boolean;
  /** Telefonun yanına yazılmış açıklama, ör. "Annesinin telefonu". */
  note: string | null;
};

export function normalizePhone(raw: unknown): PhoneResult {
  if (raw === null || raw === undefined) return { value: null, valid: false, note: null };
  if (typeof raw === "number") {
    return finishPhone(String(Math.trunc(raw)), null);
  }
  const text = cleanText(raw);
  if (!text) return { value: null, valid: false, note: null };
  const noteMatch = text.match(/\(([^)]*[^\d\s)][^)]*)\)/);
  const note = noteMatch ? cleanText(noteMatch[1]) : null;
  const withoutNote = noteMatch ? text.replace(noteMatch[0], " ") : text;
  // "O530..." gibi rakam yerine yazılmış O harfi
  const digits = withoutNote.replace(/^[oO](?=\d)/, "0").replace(/\D/g, "");
  if (!digits) return { value: cleanText(withoutNote), valid: false, note };
  return finishPhone(digits, note);
}

function finishPhone(digits: string, note: string | null): PhoneResult {
  let d = digits;
  if (d.length === 12 && d.startsWith("90")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  const valid = /^5\d{9}$/.test(d);
  return { value: valid ? d : digits, valid, note };
}

export function mapStatus(raw: unknown): StudentStatus {
  const key = normalizeKey(raw);
  if (key.startsWith("çıkar")) return "removed";
  if (key.includes("sınır")) return "at_risk";
  return "active";
}

/** Sınıf: sayı ise tam sayıya ("11.0" → "11"), metin ise kırpılmış hali. */
export function normalizeClassLabel(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return String(Math.trunc(raw));
  return cleanText(raw);
}

/** Etkinlik türü hücresi: "Fotoğraf, Liderlik" → ["Fotoğraf", "Liderlik"]. "Stüdyo/Reels" tek türdür. */
export function splitActivityTypes(raw: unknown): string[] {
  const s = cleanText(raw);
  if (!s) return [];
  return s
    .split(/[,;+]/)
    .map((p) => cleanText(p))
    .filter((p): p is string => !!p);
}
