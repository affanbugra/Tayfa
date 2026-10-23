import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getSessionState } from "@/lib/auth";
import { tr } from "@/lib/i18n/tr";

export default async function NoAccessPage() {
  const state = await getSessionState();
  if (state.status === "anon") redirect("/giris");
  if (state.status === "ok") redirect("/");
  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold text-text">{tr.auth.noAccessTitle}</h1>
      <p className="text-sm text-text-muted">{tr.auth.noAccessBody}</p>
      <p className="text-sm text-text">
        {tr.auth.signedInAs}: <span className="font-medium">{state.email}</span>
      </p>
      <form action={signOut}>
        <Button type="submit" variant="secondary" className="w-full">
          {tr.auth.signOut}
        </Button>
      </form>
    </div>
  );
}
