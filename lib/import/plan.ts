// Ayrıştırılmış workbook'u veritabanına yazılacak satırlara çevirir (CLAUDE.md §9.3). Saf fonksiyon.
import { foldName, mergeRegistrations, type MergedStudent } from "./merge";
import { normalizeKey } from "./normalize";
import type { AttendanceStatus, ParsedWorkbook } from "./parse-workbook";
import { SCHOOL_ALIASES } from "./school-aliases";
import { weekdayOf } from "./dates";

export type LoadRules = {
  /** Şenlik sütunlarının hepsine yazılacak tarih. */
  senlikDate: string;
  /** Şenlik haftasının cumartesisi; tarihsiz k. sütun bu tarihten k hafta sonrasına düşer. */
  firstWeekSaturday: string;
};

export const DEFAULT_RULES: LoadRules = { senlikDate: "2026-10-05", firstWeekSaturday: "2026-10-03" };

export type TeamRow = { sheetName: string; name: string; leaderName: string; grade: 10 | 11 };

export type StudentRow = {
  importKey: string;
  teamSheet: string;
  fullName: string;
  phone: string | null;
  phoneValid: boolean;
  parentPhone: string | null;
  parentPhoneValid: boolean;
  schoolName: string | null;
  schoolRaw: string | null;
  classLabel: string | null;
  tcNo: string | null;
  tcValid: boolean;
  birthDate: string | null;
  schoolNumber: string | null;
  status: MergedStudent["status"];
  statusReason: string | null;
  source: MergedStudent["source"];
  notes: string | null;
};

export type SessionRow = {
  teamSheet: string;
  date: string;
  activityTypes: string[];
  /** Tarih Excel'den değil kuraldan geldiyse */
  dateInferred: boolean;
  attendance: { studentImportKey: string; status: AttendanceStatus; excuseNote: string | null }[];
};

export type LoadPlan = {
  schools: string[];
  teams: TeamRow[];
  students: StudentRow[];
  sessions: SessionRow[];
  stats: Record<string, number>;
};

const SCHOOL_LOOKUP = new Map<string, string>(
  Object.entries(SCHOOL_ALIASES).flatMap(([canonical, aliases]) =>
    [canonical, ...aliases].map((a) => [normalizeKey(a), canonical] as const),
  ),
);

export function canonicalSchool(raw: string | null): string | null {
  if (!raw) return null;
  return SCHOOL_LOOKUP.get(normalizeKey(raw)) ?? raw;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildLoadPlan(parsed: ParsedWorkbook, rules: LoadRules = DEFAULT_RULES): LoadPlan {
  const stats: Record<string, number> = {
    mergedByTc: 0, mergedByName: 0, mergedBySimilarName: 0, droppedCrossTeamDuplicates: 0, inferredDates: 0, mergedSameDateColumns: 0,
  };
  const merged = parsed.teams.map((t) => ({ team: t, students: mergeRegistrations(t.students) }));

  // Başka bir ekibin ana listesinde de olan "Yeni Kayıt" satırları: ana listedeki ekip esas alınır.
  const mainIndex = new Map<string, string>();
  for (const { team, students } of merged) {
    for (const s of students.filter((x) => x.source === "excel_main")) {
      if (s.tcValid && s.tcNo) mainIndex.set(`tc:${s.tcNo}`, team.sheetName);
      mainIndex.set(`name:${foldName(s.fullName)}`, team.sheetName);
    }
  }

  const teams: TeamRow[] = [];
  const students: StudentRow[] = [];
  const sessions: SessionRow[] = [];
  const schools = new Set<string>();

  for (const { team, students: teamStudents } of merged) {
    if (team.grade === null) throw new Error(`Sayfa adından sınıf okunamadı: ${team.sheetName}`);
    teams.push({ sheetName: team.sheetName, name: `${team.leaderName} · ${team.grade}`, leaderName: team.leaderName, grade: team.grade });

    const keyByParseKey = new Map<string, string>();
    const usedKeys = new Set<string>();
    for (const s of teamStudents) {
      if (s.source === "excel_new_registration") {
        const other =
          (s.tcValid && s.tcNo ? mainIndex.get(`tc:${s.tcNo}`) : undefined) ?? mainIndex.get(`name:${foldName(s.fullName)}`);
        if (other && other !== team.sheetName) {
          stats.droppedCrossTeamDuplicates++;
          continue;
        }
      }
      if (s.matchedBy === "tc") stats.mergedByTc++;
      if (s.matchedBy === "name") stats.mergedByName++;
      if (s.matchedBy === "similar_name") stats.mergedBySimilarName++;

      let importKey = `${team.sheetName}|${s.tcValid && s.tcNo ? `tc:${s.tcNo}` : `name:${foldName(s.fullName)}`}`;
      if (usedKeys.has(importKey)) importKey = `${importKey}|row:${s.row}`;
      usedKeys.add(importKey);
      keyByParseKey.set(s.key, importKey);
      for (const k of s.mergedKeys) keyByParseKey.set(k, importKey);

      const schoolName = canonicalSchool(s.schoolRaw);
      if (schoolName) schools.add(schoolName);
      students.push({
        importKey,
        teamSheet: team.sheetName,
        fullName: s.fullName,
        phone: s.phone,
        phoneValid: s.phoneValid,
        parentPhone: s.parentPhone,
        parentPhoneValid: s.parentPhoneValid,
        schoolName,
        schoolRaw: s.schoolRaw,
        classLabel: s.classLabel,
        tcNo: s.tcNo,
        tcValid: s.tcValid,
        birthDate: s.birthDate,
        schoolNumber: s.schoolNumber,
        status: s.status,
        statusReason: s.status === "removed" ? "Excel'de Çıkarıldı olarak işaretliydi" : null,
        source: s.source,
        notes: s.notes,
      });
    }

    // Ekibin buluşma günü: Excel'de tarihi düzgün olan (Şenlik dışı) ilk buluşmanın günü, yoksa cumartesi.
    const isSenlik = (types: string[]) => types.some((t) => normalizeKey(t) === "şenlik");
    const known = team.sessions.find((x) => x.date.issue === null && x.date.date && !isSenlik(x.activityTypes));
    const sundayTeam = known?.date.date ? weekdayOf(known.date.date) === 0 : false;

    const byDate = new Map<string, SessionRow>();
    team.sessions.forEach((col) => {
      let date: string;
      let inferred = false;
      if (isSenlik(col.activityTypes)) {
        date = rules.senlikDate;
      } else if (col.date.issue === null && col.date.date) {
        date = col.date.date;
      } else {
        date = addDays(rules.firstWeekSaturday, 7 * col.slot + (sundayTeam ? 1 : 0));
        inferred = true;
        stats.inferredDates++;
      }
      const attendance = col.attendance.flatMap((a) => {
        const key = keyByParseKey.get(a.studentKey);
        return key ? [{ studentImportKey: key, status: a.status, excuseNote: a.excuseNote }] : [];
      });
      const existing = byDate.get(date);
      if (existing) {
        stats.mergedSameDateColumns++;
        existing.activityTypes = [...new Set([...existing.activityTypes, ...col.activityTypes])];
        const seen = new Map(existing.attendance.map((a) => [a.studentImportKey, a]));
        for (const a of attendance) seen.set(a.studentImportKey, a);
        existing.attendance = [...seen.values()];
        return;
      }
      const row: SessionRow = { teamSheet: team.sheetName, date, activityTypes: col.activityTypes, dateInferred: inferred, attendance };
      byDate.set(date, row);
      sessions.push(row);
    });
  }

  stats.teams = teams.length;
  stats.students = students.length;
  stats.sessions = sessions.length;
  stats.attendance = sessions.reduce((n, s) => n + s.attendance.length, 0);
  stats.schools = schools.size;
  return { schools: [...schools].sort((a, b) => a.localeCompare(b, "tr")), teams, students, sessions, stats };
}
