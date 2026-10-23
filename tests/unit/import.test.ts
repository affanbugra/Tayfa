import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { isValidTc, tcFromCell } from "@/lib/import/tc";
import { mapStatus, normalizeKey, normalizePhone, splitActivityTypes, toTitleCaseTr } from "@/lib/import/normalize";
import { parseBirthDate, parseSessionDate } from "@/lib/import/dates";
import { parseSheetName, parseWorkbook } from "@/lib/import/parse-workbook";
import { mergeRegistrations } from "@/lib/import/merge";
import { buildLoadPlan } from "@/lib/import/plan";
import { buildFakeWorkbook, fakeTc, roundTrip, TC_A, TC_B, TC_C, TC_D } from "./fake-workbook";

describe("tc", () => {
  it("validates checksum", () => {
    expect(isValidTc(fakeTc("123456780"))).toBe(true);
    expect(isValidTc("12345678901")).toBe(false);
    expect(isValidTc("58432606")).toBe(false);
    expect(isValidTc("02345678901")).toBe(false);
  });
  it("reads raw numeric value", () => {
    expect(tcFromCell(99332499514)).toBe("99332499514");
    expect(tcFromCell(" 123 ")).toBe("123");
    expect(tcFromCell(null)).toBeNull();
  });
});

describe("normalize", () => {
  it.each([
    ["5515069537", "5515069537"],
    ["0530 381 05 44", "5303810544"],
    ["90 535 479 27 51", "5354792751"],
    ["(501) 127 21 76", "5011272176"],
    ["‪+90 535 000 00 00‬", "5350000000"],
    ["O5350000000", "5350000000"],
  ])("phone %s", (raw, expected) => {
    expect(normalizePhone(raw)).toMatchObject({ value: expected, valid: true });
  });
  it("phone number cell and notes", () => {
    expect(normalizePhone(5550000003)).toMatchObject({ value: "5550000003", valid: true });
    expect(normalizePhone("5550000004(Annesinin telefonu)")).toEqual({ value: "5550000004", valid: true, note: "Annesinin telefonu" });
    expect(normalizePhone("Yok")).toMatchObject({ valid: false });
    expect(normalizePhone("12345")).toEqual({ value: "12345", valid: false, note: null });
  });
  it("title cases Turkish names", () => {
    expect(toTitleCaseTr("MUHAMMET ALİ İDEKÇİ")).toBe("Muhammet Ali İdekçi");
    expect(toTitleCaseTr("haktan ılgaz")).toBe("Haktan Ilgaz");
    expect(toTitleCaseTr("  ışıl   İNCE ")).toBe("Işıl İnce");
  });
  it("maps statuses", () => {
    expect(mapStatus("Devam Ediyor")).toBe("active");
    expect(mapStatus("devam")).toBe("active");
    expect(mapStatus(" ")).toBe("active");
    expect(mapStatus(null)).toBe("active");
    expect(mapStatus("Devamsızlık Sınırında")).toBe("at_risk");
    expect(mapStatus("ÇIKARILDI")).toBe("removed");
  });
  it("splits activity types", () => {
    expect(splitActivityTypes("Fotoğraf, Liderlik")).toEqual(["Fotoğraf", "Liderlik"]);
    expect(splitActivityTypes("Fotoğraf ")).toEqual(["Fotoğraf"]);
    expect(splitActivityTypes("Stüdyo/Reels")).toEqual(["Stüdyo/Reels"]);
  });
  it("normalizes keys for school matching", () => {
    expect(normalizeKey("Hüsnü M.özyiğin anadolu lissesi ")).toBe("hüsnü m özyiğin anadolu lissesi");
    expect(normalizeKey("HÜSNÜ M.ÖZYEĞİN")).toBe("hüsnü m özyeğin");
  });
});

describe("dates", () => {
  it("fixes program year and flags weekday", () => {
    // 2025-10-05 (şablon) → 2026-10-05 Pazartesi: şüpheli
    expect(parseSessionDate(45935)).toEqual({ date: "2026-10-05", issue: "suspicious", raw: "45935" });
    // 2026-10-10 Cumartesi
    expect(parseSessionDate(46305)).toMatchObject({ date: "2026-10-10", issue: null });
    expect(parseSessionDate("10 EKİM")).toMatchObject({ date: "2026-10-10", issue: null });
    expect(parseSessionDate("13 EKİM")).toMatchObject({ date: "2026-10-13", issue: "suspicious" });
    expect(parseSessionDate("7 mart")).toMatchObject({ date: "2027-03-07", issue: null });
    expect(parseSessionDate(" ")).toMatchObject({ date: null, issue: "missing" });
    expect(parseSessionDate("bilinmiyor")).toMatchObject({ date: null, issue: "unparsed" });
  });
  it("parses birth dates", () => {
    expect(parseBirthDate("23.8.2011")).toBe("2011-08-23");
    expect(parseBirthDate("10/08/2011")).toBe("2011-08-10");
    expect(parseBirthDate("14.1.2011")).toBe("2011-01-14");
    expect(parseBirthDate("20.10 2011")).toBe("2011-10-20");
    expect(parseBirthDate("31.2.2011")).toBeNull();
    expect(parseBirthDate("abc")).toBeNull();
  });
});

describe("parseWorkbook", () => {
  const parsed = parseWorkbook(roundTrip(buildFakeWorkbook()), XLSX.utils);
  const team = parsed.teams[0];

  it("skips Notlar and Şablon, reads sheet names", () => {
    expect(parsed.teams.map((t) => t.sheetName)).toEqual(["DENEME LİDER 10", "İKİNCİ LİDER 11", "ÜÇÜNCÜ LİDER 10"]);
    expect(team).toMatchObject({ leaderName: "Deneme Lider", grade: 10, schoolHint: "Deneme Anadolu Lisesi" });
    expect(parseSheetName("RÜMSEYSANUR MUTLU 11")).toEqual({ leaderName: "Rümseysanur Mutlu", grade: 11 });
  });

  it("reads main list and new registrations", () => {
    const main = team.students.filter((s) => s.source === "excel_main");
    expect(main.map((s) => s.fullName)).toEqual(["Muhammet Ali Denemeoğlu", "Haktan Ilgaz", "Zeynep Örnek"]);
    expect(main[0]).toMatchObject({
      tcNo: TC_A, tcValid: true, phone: "5350000001", parentPhone: "5300000002",
      classLabel: "10", birthDate: "2011-08-23", schoolNumber: "123", status: "active",
    });
    expect(main[1]).toMatchObject({ tcValid: false, phone: "5550000003", notes: "Veli: Annesinin telefonu" });
    expect(main[2].status).toBe("removed");
    const extra = team.students.filter((s) => s.source === "excel_new_registration");
    expect(extra.map((s) => s.fullName)).toEqual(["Muhammet Ali Denemeoglu", "Haktan Ilgaz", "Şeyma İnce", "Kaymış Satır", "Ayşe Bölünmüş"]);
    expect(extra[2]).toMatchObject({ tcNo: TC_B, phone: "5350000005", birthDate: "2011-08-10" });
  });

  it("repairs rows whose columns shifted by one", () => {
    const shifted = team.students.find((s) => s.fullName === "Kaymış Satır")!;
    expect(shifted).toMatchObject({ tcNo: TC_C, tcValid: true, phone: "5350000006", birthDate: null, birthDateRaw: null });
    expect(team.warnings.map((w) => `${w.code}@${w.cell}`)).toContain("columns_shifted@F45");
    const split = team.students.find((s) => s.fullName === "Ayşe Bölünmüş")!;
    expect(split).toMatchObject({
      tcNo: TC_D, tcValid: true, phone: "5350000007", birthDate: "2011-08-25", schoolRaw: "İTMTAL", classLabel: "10", schoolNumber: "77",
    });
  });

  it("reads sessions, multi-type tags, comments; skips empty and orphan values", () => {
    expect(team.sessions.map((s) => s.column)).toEqual(["L", "M", "N"]);
    const [l, m, n] = team.sessions;
    expect(l.date).toMatchObject({ date: "2026-10-05", issue: "suspicious" });
    expect(l.attendance).toHaveLength(3);
    expect(m.attendance.find((a) => a.studentKey === "main:10")).toEqual({ studentKey: "main:10", status: "excused", excuseNote: "Düğünü varmış" });
    expect(n.activityTypes).toEqual(["Fotoğraf", "Liderlik"]);
    expect(n.date.issue).toBe("missing");
    const codes = team.warnings.map((w) => `${w.code}@${w.cell}`);
    expect(codes).toContain("orphan_attendance@L9");
    expect(codes).toContain("invalid_tc@G11");
    expect(codes).toContain("session_date_missing@N8");
  });

  it("team with empty main list has no real attendance", () => {
    const second = parsed.teams[1];
    expect(second.sessions).toHaveLength(0);
    expect(second.students.map((s) => s.fullName)).toEqual(["Elif Deneme"]);
  });

  it("skips columns whose only mark is template residue on row 9", () => {
    const third = parsed.teams[2];
    expect(third.sessions.map((s) => [s.column, s.slot])).toEqual([["M", 1]]);
    expect(third.sessions[0].date.date).toBe("2026-10-11");
    expect(third.warnings.map((w) => `${w.code}@${w.cell}`)).toContain("template_residue@L9");
  });

  it("merges new registrations by TC, then by name", () => {
    const merged = mergeRegistrations(team.students);
    expect(merged).toHaveLength(6);
    const muhammet = merged.find((s) => s.key === "main:10")!;
    expect(muhammet).toMatchObject({ matchedBy: "tc", mergedKeys: ["new:42"] });
    expect(muhammet.conflicts).toEqual([{ field: "schoolNumber", kept: "123", other: "999" }]);
    expect(merged.find((s) => s.key === "main:11")).toMatchObject({ matchedBy: "name", mergedKeys: ["new:43"] });
    expect(merged.find((s) => s.key === "new:44")).toMatchObject({ source: "excel_new_registration", matchedBy: null });
  });
});

describe("buildLoadPlan", () => {
  const plan = buildLoadPlan(parseWorkbook(roundTrip(buildFakeWorkbook()), XLSX.utils));

  it("dates sessions: Şenlik rule, real dates, inferred by column order", () => {
    const deneme = plan.sessions.filter((s) => s.teamSheet === "DENEME LİDER 10");
    expect(deneme.map((s) => [s.date, s.dateInferred])).toEqual([
      ["2026-10-05", false],
      ["2026-10-10", false],
      ["2026-10-17", true],
    ]);
    expect(deneme[2].activityTypes).toEqual(["Fotoğraf", "Liderlik"]);
  });

  it("maps attendance to merged students and school aliases", () => {
    const muhammet = plan.students.find((s) => s.fullName === "Muhammet Ali Denemeoğlu")!;
    expect(muhammet.importKey).toBe(`DENEME LİDER 10|tc:${TC_A}`);
    const keys = new Set(plan.students.map((s) => s.importKey));
    for (const s of plan.sessions) for (const a of s.attendance) expect(keys.has(a.studentImportKey)).toBe(true);
    expect(plan.students.find((s) => s.fullName === "Ayşe Bölünmüş")!.schoolName).toBe(
      "İbrahim Turhan Mesleki ve Teknik Anadolu Lisesi",
    );
    expect(plan.students.find((s) => s.status === "removed")!.statusReason).toBeTruthy();
  });

  it("teams get display names", () => {
    expect(plan.teams[0]).toEqual({ sheetName: "DENEME LİDER 10", name: "Deneme Lider · 10", leaderName: "Deneme Lider", grade: 10 });
  });
});
