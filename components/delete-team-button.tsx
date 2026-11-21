"use client";

// Ayarlar'daki ekip listesinde iki dokunuşla onaylanan "Sil".
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteTeam } from "@/app/actions/admin";
import { tr } from "@/lib/i18n/tr";

export function DeleteTeamButton({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [sure, setSure] = useState(false);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      {note && <span className="text-xs text-text-muted">{note}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (!sure) return setSure(true);
          setPending(true);
          const res = await deleteTeam(teamId);
          setPending(false);
          setSure(false);
          if (!res.ok) return setNote(res.error);
          if (res.archived) setNote(tr.admin.teamArchivedInstead);
          router.refresh();
        }}
        onBlur={() => setSure(false)}
        className="min-h-9 px-2 text-xs font-medium text-absent hover:underline disabled:opacity-50"
      >
        {sure ? tr.admin.removeSure : tr.admin.removeUser}
      </button>
    </span>
  );
}
