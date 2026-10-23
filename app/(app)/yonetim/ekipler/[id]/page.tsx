import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTeam } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { percent } from "@/components/team-header";
import { buttonClass } from "@/components/ui/button";
import { Card, Field, PageTitle, inputClass } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { formatDateTr } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getTeamTypeStats } from "@/lib/data/admin";
import { attendanceRate, getSessions, getStudents } from "@/lib/data/queries";
import { tr } from "@/lib/i18n/tr";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const viewer = await requireAdmin();
  const data = await asUser(viewer.userId, async (tx) => {
    const [team] = await tx<{ id: string; name: string; leader_name: string | null; leader_email: string | null; grade: number; gender: string | null; meeting_day: string | null; is_active: boolean }[]>`
      select t.id, t.name, t.leader_name, p.email as leader_email, t.grade, t.gender, t.meeting_day, t.is_active
      from public.teams t left join public.profiles p on p.id = t.leader_id where t.id = ${id}`;
    if (!team) return null;
    const [students, sessions, typeStats] = await Promise.all([getStudents(tx, id), getSessions(tx, id), getTeamTypeStats(tx, id)]);
    return { team, students, sessions, typeStats };
  });
  if (!data) notFound();
  const { team, students, sessions, typeStats } = data;
  const q = `?ekip=${team.id}`;
  const current = students.filter((s) => s.status !== "removed" && s.present + s.absent + s.excused > 0);
  const byRate = [...current].sort((a, b) => (attendanceRate(b) ?? 0) - (attendanceRate(a) ?? 0));

  return (
    <div className="space-y-4">
      <PageTitle
        sub={`${team.leader_email ?? "Lider henüz giriş yapmadı"}`}
        action={<a href={`/api/export/team/${team.id}`} className={buttonClass("secondary")}>{tr.team.downloadExcel}</a>}
      >
        {team.name}
      </PageTitle>

      <div className="flex flex-wrap gap-2">
        <Link href={`/yoklama/yeni${q}`} className={buttonClass()}>{tr.team.takeAttendance}</Link>
        <Link href={`/ekibim${q}`} className={buttonClass("secondary")}>{tr.nav.myTeam}</Link>
        <Link href={`/yoklamalar${q}`} className={buttonClass("secondary")}>{tr.nav.sessions} ({sessions.length})</Link>
        <Link href={`/ogrenciler${q}`} className={buttonClass("secondary")}>{tr.nav.students} ({students.filter((s) => s.status !== "removed").length})</Link>
        <Link href={`/ogrenciler${q}&gorunum=tablo`} className={buttonClass("secondary")}>{tr.students.tableView}</Link>
      </div>

      <Card title={tr.team.editTeam}>
        <ActionForm action={updateTeam} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="teamId" value={team.id} />
          <Field label={tr.admin.name}><input name="name" required defaultValue={team.name} className={inputClass} /></Field>
          <Field label={tr.admin.colLeader}><input name="leader_name" defaultValue={team.leader_name ?? ""} className={inputClass} /></Field>
          <Field label={tr.admin.colGrade}>
            <select name="grade" defaultValue={String(team.grade)} className={inputClass}><option value="10">10</option><option value="11">11</option></select>
          </Field>
          <Field label={tr.team.gender}>
            <select name="gender" defaultValue={team.gender ?? ""} className={inputClass}>
              <option value="">{tr.unknown}</option><option value="K">{tr.gender.K}</option><option value="E">{tr.gender.E}</option>
            </select>
          </Field>
          <Field label={tr.team.meetingDay}>
            <select name="meeting_day" defaultValue={team.meeting_day ?? ""} className={inputClass}>
              <option value="">{tr.unknown}</option><option value="saturday">{tr.days.saturday}</option><option value="sunday">{tr.days.sunday}</option>
            </select>
          </Field>
          <Field label={tr.admin.active}>
            <select name="is_active" defaultValue={String(team.is_active)} className={inputClass}>
              <option value="true">{tr.common.yes}</option><option value="false">{tr.common.no}</option>
            </select>
          </Field>
        </ActionForm>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Etkinlik türlerine göre katılım">
          {typeStats.length === 0 ? (
            <p className="text-sm text-text-muted">{tr.session.empty}</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {typeStats.map((t) => (
                  <tr key={t.name} className="border-b border-border last:border-0">
                    <td className="py-2">{t.name}</td>
                    <td className="py-2 text-right tabular-nums text-text-muted">{t.sessions} buluşma</td>
                    <td className="py-2 text-right tabular-nums">{percent(t.total ? t.present / t.total : null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="En çok ve en az katılanlar">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[byRate.slice(0, 5), byRate.slice(-5).reverse()].map((list, i) => (
              <ul key={i} className="space-y-1">
                {list.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <Link href={`/ogrenciler/${s.id}${q}`} className="truncate hover:underline">{s.full_name}</Link>
                    <span className="tabular-nums text-text-muted">{percent(attendanceRate(s))}</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </Card>
      </div>

      <Card title={tr.session.listTitle}>
        <ul className="divide-y divide-border">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/yoklama/${s.id}${q}`} className="flex min-h-11 items-center justify-between gap-3 text-sm hover:bg-surface">
                <span>{formatDateTr(s.date)} <span className="text-text-muted">· {s.types.join(", ") || tr.common.none}</span></span>
                <span className="tabular-nums">{s.status === "held" ? `${s.present}/${s.present + s.absent + s.excused}` : tr.sessionStatus[s.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
