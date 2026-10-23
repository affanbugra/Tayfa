import { redirect } from "next/navigation";
import { devSignIn, signInWithGoogle } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/card";
import { devAuthEnabled, getSessionState } from "@/lib/auth";
import { tr } from "@/lib/i18n/tr";
import { supabaseConfigured } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const state = await getSessionState();
  if (state.status === "ok") redirect("/");
  const { hata } = await searchParams;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-text">{tr.appName}</h1>
        <p className="mt-1 text-sm text-text-muted">{tr.auth.intro}</p>
      </div>
      {hata && <p className="rounded-lg bg-absent-bg px-3 py-2 text-sm text-absent">{tr.auth.error}</p>}
      {supabaseConfigured() ? (
        <form action={signInWithGoogle}>
          <Button type="submit" className="w-full">
            <GoogleMark />
            {tr.auth.googleButton}
          </Button>
        </form>
      ) : (
        !devAuthEnabled() && <p className="text-sm text-text-muted">{tr.auth.notConfigured}</p>
      )}
      {devAuthEnabled() && (
        <form action={devSignIn} className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium text-text-muted">{tr.auth.devTitle}</p>
          <input name="email" type="email" required placeholder={tr.auth.devEmail} className={inputClass} />
          <Button type="submit" variant="secondary" className="w-full">
            {tr.auth.devButton}
          </Button>
        </form>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 18 18">
      <path fill="#fff" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#fff" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" opacity=".85" />
      <path fill="#fff" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" opacity=".7" />
      <path fill="#fff" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" opacity=".85" />
    </svg>
  );
}
