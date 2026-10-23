import { notFound, redirect } from "next/navigation";
import { AttendanceSheet } from "@/components/attendance-sheet";
import { SessionMetaForm } from "@/components/session-meta-form";
import { Card, PageTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { formatDateTr, todayIstanbul } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getActivityTypes, getSession, getStudents, getTeam } from "@/lib/data/queries";
import { tr } from "@/lib/i18n/tr";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await asUser(viewer.userId, async (tx) => {
    const session = await getSession(tx, id);
    if (!session) return null;
    const [team, students, types] = await Promise.all([getTeam(tx, session.team_id), getStudents(tx, session.team_id), getActivityTypes(tx, true)]);
    return { session, team, students, types };
  });
  if (!data) notFound();
  const { session, team, students, types } = data;
  if (viewer.role === "leader" && viewer.teamId !== session.team_id) redirect("/ekibim");

  const q = viewer.role === "admin" ? `?ekip=${session.team_id}` : "";
  const typeNames = types.filter((t) => session.typeIds.includes(t.id)).map((t) => t.name);
  // Çıkarılan öğrenciler gizlenir; ama bu buluşmada işaretlenmişlerse geçmiş korunur.
  const list = students
    .filter((s) => s.status !== "removed" || session.marks[s.id])
    .map((s) => ({ id: s.id, fullName: s.full_name, atRisk: s.status === "at_risk" }));

  return (
    <div className="space-y-4">
      <PageTitle sub={`${team?.name ?? ""}${typeNames.length ? ` · ${typeNames.join(", ")}` : ""}`}>{formatDateTr(session.date)}</PageTitle>

      <details className="rounded-lg border border-border bg-bg">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium text-brand-strong">{tr.session.details}</summary>
        <div className="border-t border-border p-4">
          <SessionMetaForm session={session} types={types.filter((t) => t.is_active || session.typeIds.includes(t.id))} today={todayIstanbul()} />
        </div>
      </details>

      {session.note && <p className="text-sm text-text-muted">{session.note}</p>}

      {session.status === "held" ? (
        <AttendanceSheet sessionId={session.id} teamId={session.team_id} students={list} initialMarks={session.marks} doneHref={`/yoklamalar${q}`} />
      ) : (
        <Card>
          <p className="text-sm text-text">
            <span className="font-medium">{tr.sessionStatus[session.status]}.</span> {tr.session.notHeldInfo}
          </p>
        </Card>
      )}
    </div>
  );
}
