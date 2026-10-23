import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-bg", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-text">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageTitle({ children, sub, action }: { children: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-semibold text-text">{children}</h1>
        {sub && <p className="mt-1 text-sm text-text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-text">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "block min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-text placeholder:text-text-muted focus:border-brand-strong focus:outline-none";
