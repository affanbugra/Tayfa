"use client";

// İki dokunuşla onaylanan "Sil" (tarayıcı onay penceresi yok).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeUser } from "@/app/actions/admin";
import { tr } from "@/lib/i18n/tr";

export function RemoveUserButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [sure, setSure] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-absent">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (!sure) return setSure(true);
          setPending(true);
          const res = await removeUser(invitationId);
          setPending(false);
          if (!res.ok) return setError(res.error);
          router.refresh();
        }}
        onBlur={() => setSure(false)}
        className="min-h-9 px-2 text-sm font-medium text-absent hover:underline disabled:opacity-50"
      >
        {sure ? tr.admin.removeSure : tr.admin.removeUser}
      </button>
    </span>
  );
}
