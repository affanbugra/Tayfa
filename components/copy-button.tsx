"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-2 text-xs text-text hover:bg-surface"
      aria-label={`${tr.students.copy}: ${value}`}
    >
      {done ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      {done ? tr.students.copied : tr.students.copy}
    </button>
  );
}
