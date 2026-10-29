import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { deleteStudent, moveStudent } from "@/app/actions/students";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "@/components/copy-button";
import { StudentStatusBadge } from "@/components/status-badge";
import { StudentStatusForm } from "@/components/student-status-form";
import { BackToSheet, percent } from "@/components/team-header";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, PageTitle, inputClass } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatDatePlain, formatDateTr } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getStudent, getStudentHistory } from "@/lib/data/queries";
import { tr } from "@/lib/i18n/tr";

const markStyle = { present: "text-present", absent: "text-absent", excused: "text-excused" } as const;

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = await requireViewer();
  const data = await asUser(viewer.userId, async (tx) => {
    const student = await getStudent(tx, id);
    if (!student) return null;
    const history = await getStudentHistory(tx, id, student.team_id);
    const teams = viewer.role === "admin" ? await tx<{ id: string; name: string }[]>`select id, name from public.teams order by name` : [];
    return { student, history, teams };
  });
  if (!data) notFound();
  const { student: s, history, teams } = data;
  if (viewer.role === "leader" && viewer.teamId !== s.team_id) redirect("/ekibim");
  const q = viewer.role === "admin" ? `?ekip=${s.team_id}` : "";

  const held = history.filter((h) => h.session_status === "held" && h.status);
  const counts = {
    present: held.filter((h) => h.status === "present").length,
    absent: held.filter((h) => h.status === "absent").length,
    excused: held.filter((h) => h.status === "excused").length,
  };
  const rate = held.length ? counts.present / held.length : null;
  const f = tr.students.fields;

  return (
    <div className="space-y-4">
      <BackToSheet teamId={s.team_id} admin={viewer.role === "admin"} />
      <PageTitle
        sub={<span className="flex items-center gap-2">{s.team_name} <StudentStatusBadge status={s.status} /></span>}
        action={<Link href={`/ogrenciler/${s.id}/duzenle${q}`} className={buttonClass("secondary")}>{tr.team.edit}</Link>}
      >
        {s.full_name}
      </PageTitle>

      <Card>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Row label={f.phone} value={s.phone} actions={s.phone && <><CopyButton value={s.phone} /><a href={`tel:+90${s.phone}`} className="inline-flex min-h-9 items-center rounded-md border border-border px-2 text-xs text-brand-strong">{tr.students.call}</a></>} />
          <Row label={f.parent_phone} value={s.parent_phone} actions={s.parent_phone && <><CopyButton value={s.parent_phone} /><a href={`tel:+90${s.parent_phone}`} className="inline-flex min-h-9 items-center rounded-md border border-border px-2 text-xs text-brand-strong">{tr.students.call}</a></>} />
          <Row label={f.tc_no} value={s.tc_no} warn={s.tc_no && !s.tc_valid ? tr.students.tcInvalid : undefined} actions={s.tc_no && <CopyButton value={s.tc_no} />} />
          <Row label={f.birth_date} value={s.birth_date ? formatDatePlain(s.birth_date) : null} />
          <Row label={f.school} value={s.school_name ?? s.school_raw} />
          <Row label={f.class_label} value={s.class_label} />
          <Row label={f.school_number} value={s.school_number} />
          <Row label={f.joined_at} value={s.joined_at ? formatDateTr(s.joined_at) : null} />
          {s.notes && <div className="sm:col-span-2"><Row label={f.notes} value={s.notes} /></div>}
          {s.status_reason && <div className="sm:col-span-2"><Row label={tr.students.statusReason} value={s.status_reason} /></div>}
        </dl>
      </Card>

      <Card title={tr.students.changeStatus}>
        <StudentStatusForm studentId={s.id} status={s.status} reason={s.status_reason} />
      </Card>

      <Card
        title={tr.students.history}
        action={<span className="text-sm tabular-nums text-text-muted">{tr.students.attendanceRate} {percent(rate)} · {counts.present}/{held.length}</span>}
      >
        {history.length === 0 ? (
          <p className="text-sm text-text-muted">{tr.session.empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((h) => (
              <li key={h.session_id}>
                <div className="flex min-h-11 items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="text-text">{formatDateTr(h.date)}</span>
                    <span className="ml-2 text-text-muted">{h.types.join(", ")}</span>
                    {h.excuse_note && <span className="block text-xs text-text-muted">{h.excuse_note}</span>}
                  </span>
                  <span className={cn("shrink-0 font-medium", h.status ? markStyle[h.status] : "text-text-muted")}>
                    {h.session_status !== "held" ? tr.sessionStatus[h.session_status] : h.status ? tr.attendance[h.status] : tr.attendance.unmarked}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {viewer.role === "admin" && (
        <Card title={tr.students.moveTeam}>
          <div className="space-y-4">
            <form action={moveStudent} className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="studentId" value={s.id} />
              <select name="teamId" defaultValue={s.team_id} className={inputClass} aria-label={tr.students.moveTeam}>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <Button type="submit" variant="secondary">{tr.common.save}</Button>
            </form>
            <form action={deleteStudent}>
              <input type="hidden" name="studentId" value={s.id} />
              <ConfirmButton message={tr.students.deleteConfirm}>{tr.students.deleteForever}</ConfirmButton>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, actions, warn }: { label: string; value: string | null; actions?: ReactNode; warn?: string }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-text">
        <span className="tabular-nums">{value || tr.common.none}</span>
        {actions}
      </dd>
      {warn && <p className="mt-1 text-xs text-at-risk">{warn}</p>}
    </div>
  );
}
