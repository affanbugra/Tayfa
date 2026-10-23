// Ana liste ile "Yeni Kayıt" satırlarını eşleştirir: önce geçerli TC, sonra aynı ad, sonra benzer ad
// (Türkçe harfler sadeleştirilmiş eşitlik ya da biri diğerinin tüm kelimelerini içeriyor). Eşleşmeyenler
// ayrı öğrenci olarak kalır.
import { normalizeKey } from "./normalize";
import type { ParsedStudent } from "./parse-workbook";

export type MergedStudent = ParsedStudent & {
  /** Bu kayda birleştirilen diğer satırların anahtarları */
  mergedKeys: string[];
  matchedBy: "tc" | "name" | "similar_name" | null;
  conflicts: { field: keyof ParsedStudent; kept: string; other: string }[];
};

const FILLABLE: (keyof ParsedStudent)[] = [
  "phone", "parentPhone", "schoolRaw", "classLabel", "tcNo", "birthDate", "schoolNumber", "notes",
];

export function mergeRegistrations(students: ParsedStudent[]): MergedStudent[] {
  const result: MergedStudent[] = students
    .filter((s) => s.source === "excel_main")
    .map((s) => ({ ...s, mergedKeys: [], matchedBy: null, conflicts: [] }));

  for (const extra of students.filter((s) => s.source === "excel_new_registration")) {
    const byTc = extra.tcValid ? result.find((m) => m.tcValid && m.tcNo === extra.tcNo) : undefined;
    const byName = byTc ? undefined : result.find((m) => normalizeKey(m.fullName) === normalizeKey(extra.fullName));
    const bySimilar = byTc || byName ? undefined : result.find((m) => m.source === "excel_main" && similarNames(m.fullName, extra.fullName));
    const target = byTc ?? byName ?? bySimilar;
    if (!target) {
      result.push({ ...extra, mergedKeys: [], matchedBy: null, conflicts: [] });
      continue;
    }
    target.mergedKeys.push(extra.key);
    target.matchedBy ??= byTc ? "tc" : byName ? "name" : "similar_name";
    for (const field of FILLABLE) {
      const kept = target[field];
      const other = extra[field];
      if (other === null || other === undefined || other === "") continue;
      if (kept === null || kept === undefined || kept === "") {
        (target as Record<string, unknown>)[field] = other;
        if (field === "tcNo") target.tcValid = extra.tcValid;
        if (field === "phone") target.phoneValid = extra.phoneValid;
      } else if (String(kept) !== String(other)) {
        target.conflicts.push({ field, kept: String(kept), other: String(other) });
      }
    }
  }
  return result;
}

/** Türkçe harfleri ASCII'ye indirger: "Denemeoğlu" ve "Denemeoglu" aynı anahtarı verir. */
export function foldName(name: string): string {
  return normalizeKey(name)
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u");
}

/** "Ayşe Yılmaz" ~ "Ayse Nur Yılmaz": sadeleştirilmiş eşitlik ya da en az iki kelimeli alt küme. */
export function similarNames(a: string, b: string): boolean {
  const fa = foldName(a);
  const fb = foldName(b);
  if (fa === fb) return true;
  const ta = fa.split(" ");
  const tb = fb.split(" ");
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.length >= 2 && short.every((w) => long.includes(w));
}
