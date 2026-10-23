"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { tr } from "@/lib/i18n/tr";

/** Server action'lı form: gönder butonu ve sonuç mesajı ile. */
export function ActionForm({
  action,
  children,
  submitLabel = tr.common.save,
  className,
  variant = "secondary",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={cn("flex flex-wrap items-end gap-3", className)}>
      {children}
      <div className="flex items-center gap-3">
        <Button type="submit" variant={variant} disabled={pending}>{submitLabel}</Button>
        {state?.ok && <span className="text-sm text-present">{tr.common.saved}</span>}
        {state?.error && <span className="text-sm text-absent">{state.error}</span>}
      </div>
    </form>
  );
}
