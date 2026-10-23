"use client";

import { useActionState } from "react";
import { deleteSession, updateSession } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/card";
import type { ActivityType } from "@/lib/data/queries";
import { tr } from "@/lib/i18n/tr";

export function SessionMetaForm({
  session,
  types,
  today,
}: {
  session: { id: string; date: string; status: string; note: string | null; typeIds: string[] };
  types: ActivityType[];
  today: string;
}) {
  const [state, action, pending] = useActionState(updateSession, null);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="sessionId" value={session.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tr.session.date}>
            <input type="date" name="date" required max={today} defaultValue={session.date} className={inputClass} />
          </Field>
          <Field label={tr.session.statusLabel}>
            <select name="status" defaultValue={session.status} className={inputClass}>
              <option value="held">{tr.session.held}</option>
              <option value="postponed">{tr.session.postponed}</option>
              <option value="cancelled">{tr.session.cancelled}</option>
            </select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text">{tr.session.types}</legend>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <label key={t.id} className="cursor-pointer">
                <input type="checkbox" name="typeIds" value={t.id} defaultChecked={session.typeIds.includes(t.id)} className="peer sr-only" />
                <span className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm peer-checked:border-brand-strong peer-checked:bg-brand-tint peer-checked:text-brand-strong peer-focus-visible:outline-2 peer-focus-visible:outline-brand-strong">
                  {t.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={tr.session.note}>
          <input type="text" name="note" defaultValue={session.note ?? ""} maxLength={1000} className={inputClass} />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" disabled={pending}>{tr.common.save}</Button>
          {state?.ok && <span className="text-sm text-present">{tr.common.saved}</span>}
          {state?.error && <span className="text-sm text-absent">{state.error}</span>}
        </div>
      </form>
      <form
        action={deleteSession}
        onSubmit={(e) => {
          if (!confirm(tr.session.deleteConfirm)) e.preventDefault();
        }}
      >
        <input type="hidden" name="sessionId" value={session.id} />
        <Button type="submit" variant="danger">{tr.session.delete}</Button>
      </form>
    </div>
  );
}
