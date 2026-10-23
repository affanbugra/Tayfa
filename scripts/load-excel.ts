// Mevcut yoklama Excel'ini veritabanına bir kez yükler (CLAUDE.md §9.3).
//
//   pnpm load-excel <dosya.xlsx>            # kuru çalıştırma: sadece sayımlar, hiçbir şey yazmaz
//   pnpm load-excel <dosya.xlsx> --apply    # DATABASE_URL'deki veritabanına tek transaction'da yazar
//
// Kişisel veri (ad, TC, telefon) asla ekrana yazdırılmaz. Dosya repoya konmaz.
import { readFileSync } from "node:fs";
import postgres from "postgres";
import * as XLSX from "xlsx";
import { parseWorkbook } from "../lib/import/parse-workbook";
import { buildLoadPlan, type LoadPlan } from "../lib/import/plan";
import { normalizeKey } from "../lib/import/normalize";

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) throw new Error("Kullanım: pnpm load-excel <dosya.xlsx> [--apply]");
  const apply = flags.includes("--apply");

  const parsed = parseWorkbook(XLSX.read(readFileSync(file), { type: "buffer" }), XLSX.utils);
  const plan = buildLoadPlan(parsed);

  const warnings: Record<string, number> = {};
  for (const t of parsed.teams) for (const w of t.warnings) warnings[w.code] = (warnings[w.code] ?? 0) + 1;
  console.log("Plan:", plan.stats);
  console.log("Uyarılar:", warnings);
  console.log("Okullar:", plan.schools.length, plan.schools);

  if (!apply) {
    console.log("\nKuru çalıştırma. Yazmak için --apply ekleyin.");
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL gerekli");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await write(sql, plan);
    console.log("\nYükleme tamamlandı.");
  } finally {
    await sql.end();
  }
}

async function write(sql: postgres.Sql, plan: LoadPlan) {
  await sql.begin(async (tx) => {
    await tx`select set_config('app.skip_audit', 'on', true)`;

    const types = await tx<{ id: string; name: string }[]>`select id, name from public.activity_types`;
    const typeId = new Map(types.map((t) => [normalizeKey(t.name), t.id]));
    for (const s of plan.sessions)
      for (const t of s.activityTypes)
        if (!typeId.has(normalizeKey(t))) throw new Error(`Bilinmeyen etkinlik türü: "${t}"`);

    const schoolId = new Map<string, string>();
    for (const name of plan.schools) {
      const [row] = await tx<{ id: string }[]>`
        insert into public.schools (name) values (${name})
        on conflict (name) do update set name = excluded.name returning id`;
      schoolId.set(name, row.id);
    }

    const teamId = new Map<string, string>();
    for (const t of plan.teams) {
      // Cinsiyet, gün ve lider uygulamadan girilir; tekrar yüklemede ezilmez.
      const [row] = await tx<{ id: string }[]>`
        insert into public.teams (sheet_name, name, leader_name, grade)
        values (${t.sheetName}, ${t.name}, ${t.leaderName}, ${t.grade})
        on conflict (sheet_name) do update set leader_name = excluded.leader_name, grade = excluded.grade
        returning id`;
      teamId.set(t.sheetName, row.id);
    }

    const studentId = new Map<string, string>();
    for (const s of plan.students) {
      const [row] = await tx<{ id: string }[]>`
        insert into public.students (
          import_key, team_id, full_name, phone, phone_valid, parent_phone, parent_phone_valid,
          school_id, school_raw, class_label, tc_no, tc_valid, birth_date, school_number,
          status, status_reason, source, notes)
        values (
          ${s.importKey}, ${teamId.get(s.teamSheet)!}, ${s.fullName}, ${s.phone}, ${s.phoneValid}, ${s.parentPhone}, ${s.parentPhoneValid},
          ${s.schoolName ? schoolId.get(s.schoolName)! : null}, ${s.schoolRaw}, ${s.classLabel}, ${s.tcNo}, ${s.tcValid},
          ${s.birthDate}, ${s.schoolNumber}, ${s.status}, ${s.statusReason}, ${s.source}, ${s.notes})
        on conflict (import_key) do update set
          full_name = excluded.full_name, phone = excluded.phone, phone_valid = excluded.phone_valid,
          parent_phone = excluded.parent_phone, parent_phone_valid = excluded.parent_phone_valid,
          school_id = excluded.school_id, school_raw = excluded.school_raw, class_label = excluded.class_label,
          tc_no = excluded.tc_no, tc_valid = excluded.tc_valid, birth_date = excluded.birth_date,
          school_number = excluded.school_number, status = excluded.status, status_reason = excluded.status_reason,
          notes = excluded.notes
        returning id`;
      studentId.set(s.importKey, row.id);
    }

    for (const s of plan.sessions) {
      const [row] = await tx<{ id: string }[]>`
        insert into public.sessions (team_id, date, status, note)
        values (${teamId.get(s.teamSheet)!}, ${s.date}, 'held', ${s.dateInferred ? "Tarih Excel'de yoktu, sıradan tahmin edildi" : null})
        on conflict (team_id, date) do update set status = 'held'
        returning id`;
      for (const t of s.activityTypes) {
        await tx`insert into public.session_activity_types (session_id, activity_type_id)
                 values (${row.id}, ${typeId.get(normalizeKey(t))!}) on conflict do nothing`;
      }
      for (const a of s.attendance) {
        await tx`
          insert into public.attendance (session_id, student_id, status, excuse_note)
          values (${row.id}, ${studentId.get(a.studentImportKey)!}, ${a.status}, ${a.excuseNote})
          on conflict (session_id, student_id) do update set status = excluded.status, excuse_note = excluded.excuse_note`;
      }
    }

    await tx`insert into public.audit_log (action, entity, diff) values ('import', 'excel', ${tx.json(plan.stats)})`;
  });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
