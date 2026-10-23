// Ana liste ile "Yeni Kayıt" satırlarını eşleştirir. Kesin eşleşmeler (geçerli TC, aynı normalize ad)
// birleştirilir; geri kalanlar ayrı öğrenci olarak kalır.
import { normalizeKey } from "./normalize";
import type { ParsedStudent } from "./parse-workbook";

export type MergedStudent = ParsedStudent & {
  /** Bu kayda birleştirilen diğer satırların anahtarları */
  mergedKeys: string[];
  matchedBy: "tc" | "name" | null;
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
    const target = byTc ?? byName;
    if (!target) {
      result.push({ ...extra, mergedKeys: [], matchedBy: null, conflicts: [] });
      continue;
    }
    target.mergedKeys.push(extra.key);
    target.matchedBy ??= byTc ? "tc" : "name";
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
