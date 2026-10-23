import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const styles: Record<Variant, string> = {
  primary: "bg-brand-strong text-brand-fg hover:bg-brand-deep",
  secondary: "border border-border bg-bg text-text hover:bg-surface",
  ghost: "text-brand-strong hover:bg-brand-tint",
  danger: "border border-border bg-bg text-absent hover:bg-absent-bg",
};

export const buttonClass = (variant: Variant = "primary", extra?: string) =>
  cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    styles[variant],
    extra,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  function Button({ variant = "primary", className, ...props }, ref) {
    return <button ref={ref} className={buttonClass(variant, className)} {...props} />;
  },
);
