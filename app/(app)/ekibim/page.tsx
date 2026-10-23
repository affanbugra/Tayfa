import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamBackLink, percent } from "@/components/team-header";
import { TeamBasicsForm } from "@/components/team-settings-form";
import { buttonClass } from "@/components/ui/button";
import { Card, PageTitle } from "@/components/ui/card";
import { formatDateTr, todayIstanbul, weekStartOf, addDaysIso } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getPlanForWeek, getSessions, getStudents, getTeam } from "@/lib/data/queries";
import { tr } from "@/lib/i18n/tr";
import { resolveTeam } from "@/lib/team-context";

export default async function MyTeamPage({ searchParams }: { searchParams: Promise<{ ekip?: string }> }) {
  const { viewer, teamId, withTeam } = await resolveTeam(searchParams);
  const today = todayIstanbul();
  const data = await asUser(viewer.userId, async (tx) => {
    const team = await getTeam(tx, teamId);
    if (!team) return null;
    const [students, sessions, plan] = await Promise.all([
      getStudents(tx, teamId),
      getSessions(tx, teamId),
      getPlanForWeek(tx, teamId, weekStartOf(today)),
    ]);
    return { team, students, sessions, plan };
  });
  if (!data) notFound();
  const { team, students, sessions, plan } = data;

  const active = students.filter((s) => s.status !== "removed");
  const watch = active
    .filter((s) => s.status === "at_risk" || s.absent >= 2)
    .sort((a, b) => b.absent - a.absent || a.full_name.localeCompare(b.full_name, "tr"))
    .slice(0, 8);
  const last = sessions.find((s) => s.status === "held");
  const since = addDaysIso(today, -28);
  const recent = sessions.filter((s) => s.status === "held" && s.date >= since);
  const recentTotals = recent.reduce((acc, s) => ({ p: acc.p + s.present, t: acc.t + s.present + s.absent + s.excused }), { p: 0, t: 0 });

  return (
    <div className="space-y-4">
      {viewer.role === "admin" && <TeamBackLink teamId={team.id} />}
      <PageTitle sub={team.schools.join(", ") || undefined}>{team.name}</PageTitle>

      <div className="space-y-2">
        <Link href={withTeam("/yoklama/yeni")} className={buttonClass("primary", "min-h-14 w-full text-base")}>
          {tr.team.takeAttendance}
        </Link>
        {plan.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-text">
            <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-text">{tr.team.thisWeek}</span>
            {plan.map((p) => p.name).join(", ")}
            {plan[0].planned_date && <span className="text-text-muted">· {formatDateTr(plan[0].planned_date)}</span>}
          </p>
        )}
      </div>

      <Card title={tr.team.lastSession} action={last && <Link href={withTeam(`/yoklama/${last.id}`)} className="text-sm text-brand-strong hover:underline">{tr.team.edit}</Link>}>
        {last ? (
          <div className="text-sm">
            <p className="font-medium text-text">{formatDateTr(last.date)}</p>
            <p className="text-text-muted">{last.types.join(", ") || tr.common.none}</p>
            <p className="mt-1 text-text">
              <span className="font-semibold tabular-nums">{last.present}/{last.present + last.absent + last.excused}</span> {tr.attendance.present.toLowerCase()}
              {last.excused > 0 && <span className="text-text-muted"> · {last.excused} {tr.attendance.excused.toLowerCase()}</span>}
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">{tr.team.noSessions}</p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Kpi label={tr.team.activeStudents} value={String(active.length)} />
        <Kpi label={tr.team.last4Weeks} value={percent(recentTotals.t ? recentTotals.p / recentTotals.t : null)} />
      </div>

      <Card title={tr.team.watchList}>
        {watch.length === 0 ? (
          <p className="text-sm text-text-muted">{tr.team.watchListEmpty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {watch.map((s) => (
              <li key={s.id}>
                <Link href={withTeam(`/ogrenciler/${s.id}`)} className="flex min-h-11 items-center justify-between gap-2 text-sm">
                  <span className="text-text">{s.full_name}</span>
                  <span className="text-text-muted tabular-nums">
                    {s.absent} {tr.team.unexcusedAbsences}
                    {s.status === "at_risk" && <span className="ml-2 text-at-risk">· {tr.studentStatus.at_risk}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <a href={`/api/export/team/${team.id}`} className={buttonClass("secondary", "w-full")}>{tr.team.downloadExcel}</a>

      <Card title={tr.team.editTeam}>
        <TeamBasicsForm teamId={team.id} meetingDay={team.meeting_day} gender={team.gender} />
      </Card>

    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="font-display text-2xl font-semibold tabular-nums text-text">{value}</p>
    </div>
  );
}
