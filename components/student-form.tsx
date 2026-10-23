"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createStudent, updateStudent } from "@/app/actions/students";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/card";
import { tr } from "@/lib/i18n/tr";

type Values = {
  id?: string;
  full_name?: string;
  phone?: string | null;
  parent_phone?: string | null;
  tc_no?: string | null;
  tc_valid?: boolean;
  birth_date?: string | null;
  school_id?: string | null;
  school_raw?: string | null;
  class_label?: string | null;
  school_number?: string | null;
  notes?: string | null;
};

export function StudentForm({ teamId, values, schools, cancelHref }: { teamId: string; values?: Values; schools: { id: string; name: string }[]; cancelHref: string }) {
  const [state, action, pending] = useActionState(values?.id ? updateStudent : createStudent, null);
  const f = tr.students.fields;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="teamId" value={teamId} />
      {values?.id && <input type="hidden" name="studentId" value={values.id} />}
      <Field label={f.full_name}>
        <input name="full_name" required minLength={2} maxLength={120} defaultValue={values?.full_name ?? ""} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={f.phone}>
          <input name="phone" type="tel" inputMode="tel" defaultValue={values?.phone ?? ""} placeholder="5XX XXX XX XX" className={inputClass} />
        </Field>
        <Field label={f.parent_phone}>
          <input name="parent_phone" type="tel" inputMode="tel" defaultValue={values?.parent_phone ?? ""} placeholder="5XX XXX XX XX" className={inputClass} />
        </Field>
        <Field label={f.tc_no} hint={values?.tc_no && values.tc_valid === false ? tr.students.tcInvalid : undefined}>
          <input name="tc_no" inputMode="numeric" maxLength={20} defaultValue={values?.tc_no ?? ""} className={inputClass} />
        </Field>
        <Field label={f.birth_date}>
          <input name="birth_date" type="date" defaultValue={values?.birth_date ?? ""} className={inputClass} />
        </Field>
        <Field label={f.school} hint={!values?.school_id && values?.school_raw ? `Excel: ${values.school_raw}` : undefined}>
          <select name="school_id" defaultValue={values?.school_id ?? ""} className={inputClass}>
            <option value="">{tr.common.none}</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label={f.class_label}>
          <input name="class_label" maxLength={30} defaultValue={values?.class_label ?? ""} placeholder="10/D" className={inputClass} />
        </Field>
        <Field label={f.school_number}>
          <input name="school_number" maxLength={30} defaultValue={values?.school_number ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label={f.notes}>
        <textarea name="notes" rows={3} maxLength={2000} defaultValue={values?.notes ?? ""} className={`${inputClass} py-2`} />
      </Field>
      {state?.error && <p className="text-sm text-absent">{state.error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>{tr.common.save}</Button>
        <Link href={cancelHref} className={buttonClass("secondary")}>{tr.common.cancel}</Link>
      </div>
    </form>
  );
}
