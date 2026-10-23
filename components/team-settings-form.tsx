"use client";

import { useActionState } from "react";
import { updateTeamBasics } from "@/app/actions/teams";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/card";
import { tr } from "@/lib/i18n/tr";

/** Lider de kullanabilir: sadece buluşma günü ve cinsiyet. */
export function TeamBasicsForm({ teamId, meetingDay, gender }: { teamId: string; meetingDay: string | null; gender: string | null }) {
  const [state, action, pending] = useActionState(updateTeamBasics, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3 sm:items-end">
      <input type="hidden" name="teamId" value={teamId} />
      <Field label={tr.team.meetingDay}>
        <select name="meeting_day" defaultValue={meetingDay ?? ""} className={inputClass}>
          <option value="">{tr.unknown}</option>
          <option value="saturday">{tr.days.saturday}</option>
          <option value="sunday">{tr.days.sunday}</option>
        </select>
      </Field>
      <Field label={tr.team.gender}>
        <select name="gender" defaultValue={gender ?? ""} className={inputClass}>
          <option value="">{tr.unknown}</option>
          <option value="K">{tr.gender.K}</option>
          <option value="E">{tr.gender.E}</option>
        </select>
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>{tr.team.save}</Button>
        {state?.ok && <span className="text-sm text-present">{tr.common.saved}</span>}
        {state?.error && <span className="text-sm text-absent">{state.error}</span>}
      </div>
    </form>
  );
}
