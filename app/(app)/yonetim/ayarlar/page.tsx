import Link from "next/link";
import { addSchool, createTeam, mergeSchools, renameSchool, saveActivityType } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Card, Field, PageTitle, inputClass } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { getActivityTypes, getSchools } from "@/lib/data/queries";
import { tr } from "@/lib/i18n/tr";

export default async function SettingsPage() {
  const viewer = await requireAdmin();
  const { types, schools, teams } = await asUser(viewer.userId, async (tx) => ({
    types: await getActivityTypes(tx, true),
    schools: await getSchools(tx),
    teams: await tx<{ id: string; name: string; grade: number; is_active: boolean }[]>`select id, name, grade, is_active from public.teams order by grade, name`,
  }));

  return (
    <div className="space-y-6">
      <PageTitle>{tr.admin.settingsTitle}</PageTitle>

      <Card title={tr.admin.activityTypes}>
        <div className="space-y-3">
          {[...types, null].map((t) => (
            <ActionForm key={t?.id ?? "new"} action={saveActivityType} className="grid grid-cols-2 gap-2 border-b border-border pb-3 last:border-0 sm:grid-cols-[2fr_1fr_1fr_auto_auto_auto]">
              <input type="hidden" name="id" value={t?.id ?? ""} />
              <Field label={t ? tr.admin.name : tr.admin.newType}><input name="name" required defaultValue={t?.name ?? ""} className={inputClass} /></Field>
              <Field label="Sıra"><input name="sort_order" type="number" min={0} defaultValue={t?.sort_order ?? 500} className={inputClass} /></Field>
              <Field label={tr.admin.capacity}><input name="default_capacity" type="number" min={0} max={50} defaultValue={t?.default_capacity ?? ""} className={inputClass} /></Field>
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="in_rotation" defaultChecked={t?.in_rotation ?? false} />{tr.admin.inRotation}</label>
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={t?.is_active ?? true} />{tr.admin.active}</label>
            </ActionForm>
          ))}
        </div>
      </Card>

      <Card title={tr.admin.teamsSettings}>
        <ul className="mb-4 grid gap-x-6 sm:grid-cols-2">
          {teams.map((t) => (
            <li key={t.id} className="flex min-h-10 items-center justify-between border-b border-border text-sm">
              <Link href={`/yonetim/ekipler/${t.id}`} className="hover:text-brand-strong hover:underline">{t.name}</Link>
              {!t.is_active && <span className="text-xs text-removed">{tr.admin.passive}</span>}
            </li>
          ))}
        </ul>
        <ActionForm action={createTeam} submitLabel="Ekip ekle" className="grid gap-3 sm:grid-cols-3">
          <Field label="Yeni ekip adı"><input name="name" required className={inputClass} /></Field>
          <Field label={tr.admin.colGrade}>
            <select name="grade" className={inputClass}><option value="10">10</option><option value="11">11</option></select>
          </Field>
        </ActionForm>
      </Card>

      <Card title={`${tr.admin.schools} (${schools.length})`}>
        <div className="space-y-2">
          {schools.map((s) => (
            <ActionForm key={s.id} action={renameSchool} className="grid grid-cols-[1fr_auto] gap-2">
              <input type="hidden" name="id" value={s.id} />
              <Field label={`${s.students} öğrenci`}><input name="name" required defaultValue={s.name} className={inputClass} /></Field>
            </ActionForm>
          ))}
        </div>
        <div className="mt-6 space-y-4 border-t border-border pt-4">
          <ActionForm action={mergeSchools} submitLabel="Birleştir" className="grid gap-3 sm:grid-cols-3">
            <Field label="Bu okulu">
              <select name="from" className={inputClass}>{schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </Field>
            <Field label={tr.admin.mergeInto}>
              <select name="into" className={inputClass}>{schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </Field>
          </ActionForm>
          <ActionForm action={addSchool} submitLabel="Okul ekle" className="grid gap-3 sm:grid-cols-2">
            <Field label="Yeni okul"><input name="name" required className={inputClass} /></Field>
          </ActionForm>
        </div>
      </Card>
    </div>
  );
}
