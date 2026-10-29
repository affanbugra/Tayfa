"use client";

// Yönetim özeti: ekipler tek tabloda. Lider e-postası, gün ve cinsiyet satırın içinde düzenlenir.
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { setTeamField, setTeamLeaderEmail } from "@/app/actions/admin";
import { cn } from "@/lib/cn";
import { tr } from "@/lib/i18n/tr";

export type TeamGridRow = {
  id: string;
  name: string;
  email: string;
  signedIn: boolean;
  day: string;
  gender: string;
  active: number;
  rate: number | null;
  atRisk: number;
  week: "entered" | "notEntered" | "waiting";
};

type SaveState = "saving" | "saved" | { error: string } | undefined;

const weekLook = {
  entered: "bg-present-bg text-present",
  notEntered: "bg-absent-bg text-absent",
  waiting: "border border-border text-text-muted",
};

const cellInput = "h-9 w-full rounded-md border border-border bg-bg px-2 text-sm text-text focus:border-brand-strong focus:outline-none";

export function TeamsGrid({ rows }: { rows: TeamGridRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg">
      <table className="w-full min-w-[960px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-text-muted">
            <th className="border-b border-border bg-surface px-3 py-2">{tr.admin.colTeam}</th>
            <th className="border-b border-border bg-surface px-3 py-2">{tr.sheet.leaderEmail}</th>
            <th className="border-b border-border bg-surface px-3 py-2">{tr.admin.colDay}</th>
            <th className="border-b border-border bg-surface px-3 py-2">{tr.sheet.gender}</th>
            <th className="border-b border-border bg-surface px-3 py-2 text-right">{tr.sheet.students}</th>
            <th className="border-b border-border bg-surface px-3 py-2 text-right">{tr.sheet.last4}</th>
            <th className="border-b border-border bg-surface px-3 py-2 text-right">{tr.admin.colAtRisk}</th>
            <th className="border-b border-border bg-surface px-3 py-2">{tr.sheet.thisWeek}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ row }: { row: TeamGridRow }) {
  const [email, setEmail] = useState(row.email);
  const [saved, setSaved] = useState(row.email);
  const [emailState, setEmailState] = useState<SaveState>();
  const [fieldState, setFieldState] = useState<SaveState>();

  async function saveEmail() {
    const value = email.trim().toLowerCase();
    if (value === saved) return;
    setEmailState("saving");
    const res = await setTeamLeaderEmail(row.id, value);
    if (!res.ok) return setEmailState({ error: res.error });
    setSaved(value);
    setEmail(value);
    setEmailState("saved");
  }

  async function saveField(field: "meeting_day" | "gender", value: string) {
    setFieldState("saving");
    const res = await setTeamField(row.id, field, value);
    setFieldState(res.ok ? "saved" : { error: res.error });
  }

  const emailError = typeof emailState === "object" ? emailState.error : null;
  const fieldError = typeof fieldState === "object" ? fieldState.error : null;

  return (
    <tr>
      <td className="border-b border-border px-3 py-2">
        <Link href={`/yonetim/ekipler/${row.id}`} className="font-medium whitespace-nowrap text-brand-strong hover:underline">{row.name}</Link>
      </td>
      <td className="w-72 border-b border-border px-3 py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveEmail();
          }}
        >
          <div className="flex items-center gap-1">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailState(undefined);
              }}
              onBlur={saveEmail}
              placeholder={tr.sheet.emailPlaceholder}
              aria-label={`${row.name} ${tr.sheet.leaderEmail}`}
              aria-invalid={emailError ? true : undefined}
              className={cn(cellInput, emailError && "border-absent")}
            />
            <StateIcon state={emailState} />
          </div>
        </form>
        <p className={cn("mt-0.5 text-[11px]", emailError ? "text-absent" : "text-text-muted")}>
          {emailError ?? (saved ? (row.signedIn && saved === row.email ? tr.sheet.signedInLeader : tr.sheet.invited) : " ")}
        </p>
      </td>
      <td className="w-36 border-b border-border px-3 py-2">
        <select defaultValue={row.day} onChange={(e) => saveField("meeting_day", e.target.value)} aria-label={`${row.name} ${tr.admin.colDay}`} className={cellInput}>
          <option value="">{tr.common.none}</option>
          <option value="saturday">{tr.days.saturday}</option>
          <option value="sunday">{tr.days.sunday}</option>
        </select>
      </td>
      <td className="w-32 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1">
          <select defaultValue={row.gender} onChange={(e) => saveField("gender", e.target.value)} aria-label={`${row.name} ${tr.sheet.gender}`} className={cellInput}>
            <option value="">{tr.common.none}</option>
            <option value="K">{tr.gender.K}</option>
            <option value="E">{tr.gender.E}</option>
          </select>
          <StateIcon state={fieldState} />
        </div>
        {fieldError && <p className="mt-0.5 text-[11px] text-absent">{fieldError}</p>}
      </td>
      <td className="border-b border-border px-3 py-2 text-right">{row.active}</td>
      <td className="border-b border-border px-3 py-2 text-right font-semibold">{row.rate === null ? tr.common.none : `%${Math.round(row.rate * 100)}`}</td>
      <td className={cn("border-b border-border px-3 py-2 text-right", row.atRisk > 0 && "font-semibold text-at-risk")}>{row.atRisk}</td>
      <td className="border-b border-border px-3 py-2">
        <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", weekLook[row.week])}>
          {row.week === "entered" ? tr.sheet.entered : row.week === "notEntered" ? tr.sheet.notEntered : tr.sheet.waiting}
        </span>
      </td>
    </tr>
  );
}

function StateIcon({ state }: { state: SaveState }) {
  return (
    <span className="flex w-5 shrink-0 justify-center" aria-live="polite">
      {state === "saving" && <span className="text-[11px] text-text-muted">…</span>}
      {state === "saved" && <Check size={16} className="text-present" aria-label={tr.common.saved} />}
    </span>
  );
}
