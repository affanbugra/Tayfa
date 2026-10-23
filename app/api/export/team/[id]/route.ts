import { getSessionState } from "@/lib/auth";
import { formatDateShort } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getTeamMatrix } from "@/lib/data/matrix";
import { attendanceRate, getStudent, getStudents, getTeam } from "@/lib/data/queries";
import { sheetFrom, workbookBuffer, xlsxResponse, type Column } from "@/lib/export/xlsx";
import { tr } from "@/lib/i18n/tr";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await getSessionState();
  if (state.status !== "ok") return new Response("Yetkisiz", { status: 401 });
  const viewer = state.viewer;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Bulunamadı", { status: 404 });

  const result = await asUser(viewer.userId, async (tx) => {
    const team = await getTeam(tx, id);
    if (!team) return null;
    const list = await getStudents(tx, id);
    const details = await Promise.all(list.map((s) => getStudent(tx, s.id)));
    const matrix = await getTeamMatrix(tx, id);
    await tx`select public.log_export('team_excel', ${id}, ${tx.json({ rows: list.length })})`;
    return { team, list, details, matrix };
  });
  if (!result) return new Response("Bulunamadı", { status: 404 });
  const { team, list, details, matrix } = result;
  const f = tr.students.fields;

  type Row = (typeof list)[number] & { d: NonNullable<(typeof details)[number]> };
  const rows: Row[] = list.map((s, i) => ({ ...s, d: details[i]! }));
  const studentCols: Column<Row>[] = [
    { header: f.full_name, value: (r) => r.full_name, width: 28 },
    { header: f.status, value: (r) => tr.studentStatus[r.status] },
    { header: f.tc_no, value: (r) => r.d.tc_no, kind: "text", width: 14 },
    { header: f.birth_date, value: (r) => r.d.birth_date, kind: "date", width: 12 },
    { header: f.phone, value: (r) => r.d.phone, kind: "text", width: 13 },
    { header: f.parent_phone, value: (r) => r.d.parent_phone, kind: "text", width: 13 },
    { header: f.school, value: (r) => r.d.school_name ?? r.d.school_raw, width: 36 },
    { header: f.class_label, value: (r) => r.class_label },
    { header: f.school_number, value: (r) => r.d.school_number, kind: "text" },
    { header: tr.attendance.present, value: (r) => r.present, kind: "number" },
    { header: tr.attendance.absent, value: (r) => r.absent, kind: "number" },
    { header: tr.attendance.excused, value: (r) => r.excused, kind: "number" },
    { header: `${tr.students.attendanceRate} %`, value: (r) => { const x = attendanceRate(r); return x === null ? null : Math.round(x * 100); }, kind: "number" },
    { header: f.notes, value: (r) => r.d.notes, width: 30 },
  ];
  const attendanceCols: Column<Row>[] = [
    { header: f.full_name, value: (r) => r.full_name, width: 28 },
    ...matrix.sessions.map((se) => ({
      header: `${formatDateShort(se.date)} ${se.types}`.trim(),
      value: (r: Row) => {
        if (se.status !== "held") return tr.sessionStatus[se.status];
        const c = matrix.cell(r.id, se.id);
        return c ? tr.attendance[c] : null;
      },
      width: 14,
    })),
  ];

  const buffer = workbookBuffer([
    { name: tr.students.title, sheet: sheetFrom(rows, studentCols) },
    { name: tr.session.listTitle, sheet: sheetFrom(rows, attendanceCols) },
  ]);
  return xlsxResponse(buffer, `${team.name.replace(/[\\/:*?"<>|·]/g, "").trim()} - Tayfa.xlsx`);
}
