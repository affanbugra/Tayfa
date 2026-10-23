"use client";

import { useActionState, useState } from "react";
import { changeStudentStatus } from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/card";
import { tr } from "@/lib/i18n/tr";

export function StudentStatusForm({ studentId, status, reason }: { studentId: string; status: string; reason: string | null }) {
  const [state, action, pending] = useActionState(changeStudentStatus, null);
  const [value, setValue] = useState(status);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="studentId" value={studentId} />
      <Field label={tr.students.changeStatus}>
        <select name="status" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}>
          {(["active", "at_risk", "removed"] as const).map((s) => (
            <option key={s} value={s}>{tr.studentStatus[s]}</option>
          ))}
        </select>
      </Field>
      <Field label={tr.students.statusReason} hint={value === "removed" ? tr.students.reasonRequired : undefined}>
        <input name="reason" defaultValue={reason ?? ""} required={value === "removed"} maxLength={500} className={inputClass} />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>{tr.common.save}</Button>
        {state?.ok && <span className="text-sm text-present">{tr.common.saved}</span>}
        {state?.error && <span className="text-sm text-absent">{state.error}</span>}
      </div>
    </form>
  );
}
