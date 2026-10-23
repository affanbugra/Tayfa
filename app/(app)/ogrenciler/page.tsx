import Link from "next/link";
import { StudentList } from "@/components/student-list";
import { buttonClass } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/card";
import { TeamBackLink, percent } from "@/components/team-header";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getTeamMatrix } from "@/lib/data/matrix";
import { attendanceRate, getStudents, getTeam } from "@/lib/data/queries";
import { tr } from "@/lib/i18n/tr";
import { resolveTeam } from "@/lib/team-context";

const cellStyle = { present: "bg-present-bg text-present", absent: "bg-absent-bg text-absent", excused: "bg-excused-bg text-excused" };
const cellLetter = { present: "✓", absent: "✕", excused: "M" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ ekip?: string; gorunum?: string }> }) {
  const sp = await searchParams;
  const { viewer, teamId, withTeam } = await resolveTeam(Promise.resolve(sp));
  const table = sp.gorunum === "tablo";
  const { team, students, matrix } = await asUser(viewer.userId, async (tx) => ({
    team: await getTeam(tx, teamId),
    students: await getStudents(tx, teamId),
    matrix: table ? await getTeamMatrix(tx, teamId) : null,
  }));

  return (
    <div>
      {viewer.role === "admin" && <TeamBackLink teamId={teamId} />}
      <PageTitle
        sub={team?.name}
        action={
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-border bg-bg p-0.5 text-sm" role="tablist">
              <Link href={withTeam("/ogrenciler")} aria-current={!table ? "page" : undefined} className={cn("rounded-md px-3 py-2", !table ? "bg-brand-tint font-medium text-brand-strong" : "text-text")}>
                {tr.students.listView}
              </Link>
              <Link href={withTeam("/ogrenciler?gorunum=tablo")} aria-current={table ? "page" : undefined} className={cn("rounded-md px-3 py-2", table ? "bg-brand-tint font-medium text-brand-strong" : "text-text")}>
                {tr.students.tableView}
              </Link>
            </div>
            <Link href={withTeam("/ogrenciler/yeni")} className={buttonClass()}>{tr.students.add}</Link>
          </div>
        }
      >
        {tr.students.title}
      </PageTitle>

      {!matrix ? (
        <StudentList
          items={students.map((s) => ({
            id: s.id,
            fullName: s.full_name,
            status: s.status,
            school: s.school_name ?? s.school_raw,
            classLabel: s.class_label,
            rate: percent(attendanceRate(s)),
            absent: s.absent,
            href: withTeam(`/ogrenciler/${s.id}`),
          }))}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-bg">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-border bg-bg px-3 py-2 text-left font-medium">{tr.students.fields.full_name}</th>
                {matrix.sessions.map((se) => (
                  <th key={se.id} className="border-b border-l border-border px-2 py-2 text-center text-xs font-medium whitespace-nowrap" title={se.types}>
                    <Link href={withTeam(`/yoklama/${se.id}`)} className="hover:underline">
                      {formatDateShort(se.date)}
                      <span className="block font-normal text-text-muted">{se.types || tr.common.none}</span>
                    </Link>
                  </th>
                ))}
                <th className="border-b border-l border-border px-3 py-2 text-right font-medium">{tr.students.attendanceRate}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className={s.status === "removed" ? "text-removed" : ""}>
                  <td className="sticky left-0 z-10 border-b border-border bg-bg px-3 py-1.5 whitespace-nowrap">
                    <Link href={withTeam(`/ogrenciler/${s.id}`)} className="hover:underline">{s.full_name}</Link>
                  </td>
                  {matrix.sessions.map((se) => {
                    const c = matrix.cell(s.id, se.id);
                    return (
                      <td key={se.id} className={cn("border-b border-l border-border px-2 py-1.5 text-center text-xs font-semibold", c && cellStyle[c])}>
                        {c ? <span title={tr.attendance[c]}>{cellLetter[c]}</span> : ""}
                      </td>
                    );
                  })}
                  <td className="border-b border-l border-border px-3 py-1.5 text-right tabular-nums">{percent(attendanceRate(s))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-3 py-2 text-xs text-text-muted">
            ✓ {tr.attendance.present} · ✕ {tr.attendance.absent} · M {tr.attendance.excused}
          </p>
        </div>
      )}
    </div>
  );
}
