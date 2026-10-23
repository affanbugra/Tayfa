"use client";

import { BarChart3, CalendarCheck, Home, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string; icon: "home" | "calendar" | "users" | "chart" | "settings" };

const icons = { home: Home, calendar: CalendarCheck, users: Users, chart: BarChart3, settings: Settings };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "side" | "bottom" }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/yonetim" ? pathname === "/yonetim" || pathname.startsWith("/yonetim/ekipler") : pathname.startsWith(href);

  if (variant === "bottom") {
    return (
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = icons[item.icon];
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 text-xs",
                  active ? "border-accent font-semibold text-brand-strong" : "border-transparent text-text-muted",
                )}
              >
                <Icon size={20} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg border-l-2 px-3 text-sm",
                active ? "border-accent bg-brand-tint font-semibold text-brand-strong" : "border-transparent text-text hover:bg-surface",
              )}
            >
              <Icon size={18} aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
