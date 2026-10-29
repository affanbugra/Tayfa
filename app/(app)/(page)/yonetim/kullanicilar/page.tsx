import { deleteInvitation, inviteUser, setProfileActive } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Card, Field, PageTitle, inputClass } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { formatDateShort } from "@/lib/dates";
import { asUser } from "@/lib/db";
import { getInvitations } from "@/lib/data/admin";
import { tr } from "@/lib/i18n/tr";

export default async function UsersPage() {
  const viewer = await requireAdmin();
  const { invitations, teams } = await asUser(viewer.userId, async (tx) => ({
    invitations: await getInvitations(tx),
    teams: await tx<{ id: string; name: string; has_leader: boolean }[]>`
      select id, name, leader_id is not null as has_leader from public.teams where is_active order by name`,
  }));
  const invitedTeams = new Set(invitations.filter((i) => i.team_id).map((i) => i.team_id));

  return (
    <div className="space-y-4">
      <PageTitle sub="Sadece bu listedeki e-postalar Google ile giriş yapabilir.">{tr.admin.usersTitle}</PageTitle>

      <Card title={tr.admin.invite}>
        <ActionForm action={inviteUser} variant="primary" submitLabel={tr.admin.invite} className="grid gap-3 sm:grid-cols-4">
          <Field label={tr.admin.email}><input name="email" type="email" required placeholder="ornek@gmail.com" className={inputClass} /></Field>
          <Field label={tr.admin.role}>
            <select name="role" defaultValue="leader" className={inputClass}>
              <option value="leader">{tr.admin.roles.leader}</option>
              <option value="admin">{tr.admin.roles.admin}</option>
            </select>
          </Field>
          <Field label={tr.admin.team} hint="Sadece lider için">
            <select name="teamId" defaultValue="" className={inputClass}>
              <option value="">{tr.common.none}</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{invitedTeams.has(t.id) ? " (davetli)" : ""}</option>
              ))}
            </select>
          </Field>
        </ActionForm>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border bg-bg">
        <table className="min-w-full text-sm">
          <thead className="text-left text-text-muted">
            <tr>
              <th className="border-b border-border px-3 py-2 font-medium">{tr.admin.email}</th>
              <th className="border-b border-border px-3 py-2 font-medium">{tr.admin.role}</th>
              <th className="border-b border-border px-3 py-2 font-medium">{tr.admin.team}</th>
              <th className="border-b border-border px-3 py-2 font-medium">{tr.admin.lastSeen}</th>
              <th className="border-b border-border px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {invitations.map((i) => (
              <tr key={i.id}>
                <td className="border-b border-border px-3 py-2">
                  {i.email}
                  {i.full_name && <span className="block text-xs text-text-muted">{i.full_name}</span>}
                </td>
                <td className="border-b border-border px-3 py-2">{tr.admin.roles[i.role]}</td>
                <td className="border-b border-border px-3 py-2">{i.team_name ?? tr.common.none}</td>
                <td className="border-b border-border px-3 py-2 whitespace-nowrap">
                  {i.profile_id ? (
                    <>
                      {i.last_seen_at ? formatDateShort(i.last_seen_at.slice(0, 10)) : tr.common.none}
                      {i.is_active === false && <span className="ml-2 rounded-md bg-surface px-1.5 py-0.5 text-xs text-removed">{tr.admin.passive}</span>}
                    </>
                  ) : (
                    <span className="text-text-muted">{tr.admin.pending}</span>
                  )}
                </td>
                <td className="border-b border-border px-3 py-2 text-right whitespace-nowrap">
                  {i.profile_id && i.profile_id !== viewer.userId && (
                    <form action={setProfileActive} className="inline">
                      <input type="hidden" name="id" value={i.profile_id} />
                      <input type="hidden" name="active" value={String(!i.is_active)} />
                      <button type="submit" className="min-h-9 px-2 text-sm text-brand-strong hover:underline">
                        {i.is_active ? tr.admin.deactivate : tr.admin.activate}
                      </button>
                    </form>
                  )}
                  {!i.profile_id && (
                    <form action={deleteInvitation} className="inline">
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="min-h-9 px-2 text-sm text-absent hover:underline">{tr.admin.removeInvite}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
