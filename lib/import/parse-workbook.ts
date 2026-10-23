// Tayfa yoklama Excel'ini (CLAUDE.md §9) saf veri yapısına çevirir; veritabanına bir şey yazmaz.
// Yükleme script'i (scripts/load-excel.ts) bu çıktıyı kullanır.
import type { CellObject, WorkBook, WorkSheet } from "xlsx";
import { cleanText, mapStatus, normalizeClassLabel, normalizeKey, normalizePhone, splitActivityTypes, toTitleCaseTr, type StudentStatus } from "./normalize";
import { parseBirthDate, parseSessionDate, type SessionDateResult } from "./dates";
import { isValidTc, tcFromCell } from "./tc";

export const SKIPPED_SHEETS = ["notlar", "şablon"];
const MAIN_FIRST_ROW = 9;
const MAIN_LAST_ROW = 33;
const FIRST_ATTENDANCE_COL = 11; // L (0 tabanlı)

export type AttendanceStatus = "present" | "absent" | "excused";

export type ParsedStudent = {
  /** Sayfa içinde benzersiz anahtar, ör. "main:12" veya "new:45" */
  key: string;
  source: "excel_main" | "excel_new_registration";
  row: number;
  fullName: string;
  fullNameRaw: string;
  status: StudentStatus;
  phone: string | null;
  phoneValid: boolean;
  parentPhone: string | null;
  parentPhoneValid: boolean;
  schoolRaw: string | null;
  classLabel: string | null;
  tcNo: string | null;
  tcValid: boolean;
  birthDate: string | null;
  birthDateRaw: string | null;
  schoolNumber: string | null;
  notes: string | null;
};

export type ParsedAttendance = {
  studentKey: string;
  status: AttendanceStatus;
  excuseNote: string | null;
};

export type ParsedSession = {
  column: string;
  activityTypes: string[];
  date: SessionDateResult;
  attendance: ParsedAttendance[];
};

export type ImportWarning = {
  sheet: string;
  cell: string | null;
  code:
    | "invalid_tc"
    | "invalid_phone"
    | "invalid_birth_date"
    | "orphan_attendance"
    | "unknown_attendance_value"
    | "session_date_missing"
    | "session_date_suspicious"
    | "session_date_unparsed"
    | "unparsed_sheet_name"
    | "columns_shifted";
  message: string;
};

export type ParsedTeam = {
  sheetName: string;
  leaderName: string;
  grade: 10 | 11 | null;
  schoolHint: string | null;
  students: ParsedStudent[];
  sessions: ParsedSession[];
  warnings: ImportWarning[];
};

export type ParsedWorkbook = { teams: ParsedTeam[] };

type XlsxUtils = {
  encode_cell: (c: { r: number; c: number }) => string;
  encode_col: (c: number) => string;
  decode_range: (r: string) => { s: { r: number; c: number }; e: { r: number; c: number } };
};

/** `utils` dışarıdan verilir: parser xlsx'in ağır modülünü kendisi içe aktarmaz. */
export function parseWorkbook(wb: WorkBook, utils: XlsxUtils): ParsedWorkbook {
  const teams: ParsedTeam[] = [];
  for (const sheetName of wb.SheetNames) {
    if (SKIPPED_SHEETS.includes(normalizeKey(sheetName))) continue;
    teams.push(parseTeamSheet(sheetName, wb.Sheets[sheetName], utils));
  }
  return { teams };
}

export function parseSheetName(sheetName: string): { leaderName: string; grade: 10 | 11 | null } {
  const clean = cleanText(sheetName) ?? sheetName;
  const m = clean.match(/^(.*\S)\s+(10|11)$/);
  if (!m) return { leaderName: toTitleCaseTr(clean) ?? clean, grade: null };
  return { leaderName: toTitleCaseTr(m[1]) ?? m[1], grade: Number(m[2]) as 10 | 11 };
}

function parseTeamSheet(sheetName: string, ws: WorkSheet, utils: XlsxUtils): ParsedTeam {
  const warnings: ImportWarning[] = [];
  const cell = (row: number, col: number): CellObject | undefined =>
    ws[utils.encode_cell({ r: row - 1, c: col })] as CellObject | undefined;
  const value = (row: number, col: number) => cell(row, col)?.v;
  const addr = (row: number, col: number) => utils.encode_cell({ r: row - 1, c: col });
  const warn = (code: ImportWarning["code"], c: string | null, message: string) =>
    warnings.push({ sheet: sheetName, cell: c, code, message });

  const { leaderName, grade } = parseSheetName(sheetName);
  if (grade === null) warn("unparsed_sheet_name", null, "Sayfa adından sınıf seviyesi okunamadı");

  const range = ws["!ref"] ? utils.decode_range(ws["!ref"]) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  const lastRow = range.e.r + 1;
  const lastCol = range.e.c;

  const students: ParsedStudent[] = [];
  const mainRowToKey = new Map<number, string>();

  const buildStudent = (
    source: ParsedStudent["source"],
    row: number,
    cols: { name: number; status?: number; phone: number; school: number; cls: number; tc: number; birth: number; parent?: number; schoolNo: number },
  ): ParsedStudent | null => {
    const nameRaw = cleanText(value(row, cols.name));
    if (!nameRaw) return null;
    const key = `${source === "excel_main" ? "main" : "new"}:${row}`;
    let phoneCell: unknown = value(row, cols.phone);
    let tcCell: unknown = value(row, cols.tc);
    let birthCell: unknown = value(row, cols.birth);
    // Bazı satırlarda veriler bir sütun kaymış: TC doğum tarihi sütununda, telefon TC sütununda.
    const birthAsTc = tcFromCell(birthCell);
    if (typeof birthCell !== "object" && birthAsTc?.length === 11 && isValidTc(birthAsTc) && !isValidTc(tcFromCell(tcCell))) {
      if (!normalizePhone(phoneCell).valid && normalizePhone(tcCell).valid) phoneCell = tcCell;
      tcCell = birthCell;
      birthCell = null;
      warn("columns_shifted", addr(row, cols.tc), "Satırda sütunlar kaymış görünüyor: TC doğum tarihi sütunundan alındı");
    }
    const phone = normalizePhone(phoneCell);
    const parent = cols.parent !== undefined ? normalizePhone(value(row, cols.parent)) : normalizePhone(null);
    const tcNo = tcFromCell(tcCell);
    const tcValid = isValidTc(tcNo);
    const birthDate = parseBirthDate(birthCell);
    const birthDateRaw = cleanText(birthCell);

    if (tcNo && !tcValid) warn("invalid_tc", addr(row, cols.tc), "TC 11 hane değil ya da doğrulama tutmuyor");
    if (phone.value && !phone.valid) warn("invalid_phone", addr(row, cols.phone), "Telefon 5XXXXXXXXX biçimine çevrilemedi");
    if (parent.value && !parent.valid && cols.parent !== undefined)
      warn("invalid_phone", addr(row, cols.parent), "Veli telefonu 5XXXXXXXXX biçimine çevrilemedi");
    if (birthDateRaw && !birthDate && cols.birth !== undefined)
      warn("invalid_birth_date", addr(row, cols.birth), "Doğum tarihi okunamadı");

    const notes = [phone.note, parent.note ? `Veli: ${parent.note}` : null].filter(Boolean).join(" · ") || null;
    const schoolNumber = value(row, cols.schoolNo);

    return {
      key,
      source,
      row,
      fullName: toTitleCaseTr(nameRaw) ?? nameRaw,
      fullNameRaw: nameRaw,
      status: cols.status !== undefined ? mapStatus(value(row, cols.status)) : "active",
      phone: phone.value,
      phoneValid: phone.valid,
      parentPhone: parent.value,
      parentPhoneValid: parent.valid,
      schoolRaw: cleanText(value(row, cols.school)),
      classLabel: normalizeClassLabel(value(row, cols.cls)),
      tcNo,
      tcValid,
      birthDate,
      birthDateRaw: birthDate ? null : birthDateRaw,
      schoolNumber: typeof schoolNumber === "number" ? String(Math.trunc(schoolNumber)) : cleanText(schoolNumber),
      notes,
    };
  };

  // Ana liste: B ad · C durum · D telefon · E okul · F sınıf · G TC · H doğum · I veli · J okul no
  for (let row = MAIN_FIRST_ROW; row <= MAIN_LAST_ROW; row++) {
    const s = buildStudent("excel_main", row, { name: 1, status: 2, phone: 3, school: 4, cls: 5, tc: 6, birth: 7, parent: 8, schoolNo: 9 });
    if (s) {
      students.push(s);
      mainRowToKey.set(row, s.key);
    }
  }

  // Yeni Kayıt: başlık satırı sayfadan sayfaya değişiyor (38–43), D sütununda "Adı Soyadı" aranır.
  // D ad · E iletişim · F TC · G doğum · H okul · I sınıf · J okul no
  let newRegHeader = 0;
  for (let row = MAIN_LAST_ROW + 1; row <= lastRow; row++) {
    if (normalizeKey(value(row, 3)).startsWith("adı soyadı")) {
      newRegHeader = row;
      break;
    }
  }
  for (let row = newRegHeader ? newRegHeader + 1 : lastRow + 1; row <= lastRow; row++) {
    const s = buildStudent("excel_new_registration", row, { name: 3, phone: 4, tc: 5, birth: 6, school: 7, cls: 8, schoolNo: 9 });
    if (s) students.push(s);
  }

  // Yoklama sütunları
  const sessions: ParsedSession[] = [];
  for (let col = FIRST_ATTENDANCE_COL; col <= lastCol; col++) {
    const typeText = cleanText(value(7, col));
    if (typeText && normalizeKey(typeText).startsWith("not")) break; // "Notlar" sütunu
    const dateCell = value(8, col);
    const marks: ParsedAttendance[] = [];

    for (let row = MAIN_FIRST_ROW; row <= lastRow; row++) {
      const raw = cleanText(value(row, col));
      if (!raw) continue;
      const status = mapAttendance(raw);
      if (!status) {
        if (row <= MAIN_LAST_ROW) warn("unknown_attendance_value", addr(row, col), `Tanınmayan yoklama değeri: "${raw}"`);
        continue;
      }
      const studentKey = row <= MAIN_LAST_ROW ? mainRowToKey.get(row) : undefined;
      if (!studentKey) {
        warn("orphan_attendance", addr(row, col), "Öğrencisi olmayan satırda yoklama değeri, atlandı");
        continue;
      }
      const comment = cell(row, col)?.c?.map((c) => c.t).join(" ");
      marks.push({ studentKey, status, excuseNote: cleanComment(comment) });
    }

    const activityTypes = splitActivityTypes(typeText);
    const hasDate = cleanText(dateCell) !== null;
    if (marks.length === 0) continue; // şablondan kalma boş sütun

    const date = parseSessionDate(hasDate ? dateCell : null);
    const column = utils.encode_col(col);
    if (date.issue === "missing") warn("session_date_missing", `${column}8`, "Yoklama var ama tarih yok");
    if (date.issue === "suspicious") warn("session_date_suspicious", `${column}8`, `Tarih şüpheli (${date.raw} → ${date.date})`);
    if (date.issue === "unparsed") warn("session_date_unparsed", `${column}8`, `Tarih okunamadı: "${date.raw}"`);
    sessions.push({ column, activityTypes, date, attendance: marks });
  }

  const schoolHint = cleanText(value(5, 3));
  return { sheetName, leaderName, grade, schoolHint, students, sessions, warnings };
}

export function mapAttendance(raw: string): AttendanceStatus | null {
  const key = normalizeKey(raw);
  if (key === "geldi") return "present";
  if (key === "gelmedi") return "absent";
  if (key === "mazeret" || key === "mazeretli") return "excused";
  return null;
}

function cleanComment(text: string | undefined): string | null {
  return cleanText(text);
}
