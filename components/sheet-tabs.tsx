"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { tr } from "@/lib/i18n/tr";

export function SheetTabs({ teams }: { teams: { id: string; name: string }[] }) {
  const pathname = usePathname();
  const bar = useRef<HTMLElement>(null);
  const tabs = [{ href: "/yonetim", label: tr.sheet.tabSummary }, ...teams.map((t) => ({ href: `/yonetim/ekipler/${t.id}`, label: t.name }))];

  useEffect(() => {
    bar.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  return (
    <nav ref={bar} aria-label={tr.sheet.tabsLabel} className="sticky bottom-0 z-30 flex overflow-x-auto border-t border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)]">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center px-4 text-sm whitespace-nowrap",
              active ? "bg-bg font-semibold text-text shadow-[inset_0_3px_0_var(--accent)]" : "text-text-muted hover:bg-bg hover:text-text",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
