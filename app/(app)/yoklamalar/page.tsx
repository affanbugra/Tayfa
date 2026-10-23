import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/card";
import { TeamBackLink } from "@/components/team-header";
import { formatDateTr } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getSessions, getTeam } from "@/lib/data/queries";
import { tr } from "@/lib/i18n/tr";
import { resolveTeam } from "@/lib/team-context";

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ ekip?: string }> }) {
  const { viewer, teamId, withTeam } = await resolveTeam(searchParams);
  const { team, sessions } = await asUser(viewer.userId, async (tx) => ({ team: await getTeam(tx, teamId), sessions: await getSessions(tx, teamId) }));

  return (
    <div>
      {viewer.role === "admin" && <TeamBackLink teamId={teamId} />}
      <PageTitle sub={team?.name} action={<Link href={withTeam("/yoklama/yeni")} className={buttonClass()}>{tr.team.takeAttendance}</Link>}>
        {tr.session.listTitle}
      </PageTitle>
      {sessions.length === 0 ? (
        <p className="text-sm text-text-muted">{tr.session.empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-bg">
          {sessions.map((s) => {
            const total = s.present + s.absent + s.excused;
            return (
              <li key={s.id}>
                <Link href={withTeam(`/yoklama/${s.id}`)} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 hover:bg-surface">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">{formatDateTr(s.date)}</p>
                    <p className="truncate text-xs text-text-muted">{s.types.join(", ") || tr.common.none}</p>
                  </div>
                  {s.status === "held" ? (
                    <p className="shrink-0 text-sm tabular-nums text-text">
                      {s.present}/{total} <span className="text-text-muted">{tr.attendance.present.toLowerCase()}</span>
                    </p>
                  ) : (
                    <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 text-xs text-text-muted">{tr.sessionStatus[s.status]}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
