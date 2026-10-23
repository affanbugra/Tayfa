"use client";

import { AlertCircle, Check, Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { markAllPresent, quickAddStudent, setAttendance } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { tr } from "@/lib/i18n/tr";

type Status = "present" | "absent" | "excused";
type Mark = { status: Status; note: string };
type RowState = "saving" | "error" | undefined;
type Student = { id: string; fullName: string; atRisk: boolean };

const options: { value: Status; label: string; on: string }[] = [
  { value: "present", label: tr.attendance.present, on: "border-present bg-present text-white" },
  { value: "absent", label: tr.attendance.absent, on: "border-absent bg-absent text-white" },
  { value: "excused", label: tr.attendance.excused, on: "border-excused bg-excused text-white" },
];

export function AttendanceSheet({
  sessionId,
  teamId,
  students: initialStudents,
  initialMarks,
  doneHref,
}: {
  sessionId: string;
  teamId: string;
  students: Student[];
  initialMarks: Record<string, { status: Status; excuse_note: string | null }>;
  doneHref: string;
}) {
  const router = useRouter();
  const [students, setStudents] = useState(initialStudents);
  const [marks, setMarks] = useState<Record<string, Mark>>(() =>
    Object.fromEntries(Object.entries(initialMarks).map(([id, m]) => [id, { status: m.status, note: m.excuse_note ?? "" }])),
  );
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const versions = useRef<Record<string, number>>({});

  const busy = Object.values(rows).some(Boolean);
  useEffect(() => {
    if (!busy) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy]);

  const save = useCallback(
    async (studentId: string, mark: Mark) => {
      const version = (versions.current[studentId] ?? 0) + 1;
      versions.current[studentId] = version;
      setRows((r) => ({ ...r, [studentId]: "saving" }));
      const res = await setAttendance({ sessionId, studentId, status: mark.status, excuseNote: mark.note });
      if (versions.current[studentId] !== version) return; // daha yeni bir dokunuş var
      setRows((r) => ({ ...r, [studentId]: res.ok ? undefined : "error" }));
    },
    [sessionId],
  );

  const choose = (studentId: string, status: Status) => {
    const prev = marks[studentId];
    if (prev?.status === status) return;
    const mark = { status, note: status === "excused" ? (prev?.note ?? "") : "" };
    setMarks((m) => ({ ...m, [studentId]: mark }));
    void save(studentId, mark);
  };

  const allPresent = async () => {
    const ids = students.filter((s) => !marks[s.id]).map((s) => s.id);
    if (ids.length === 0) return;
    setMarks((m) => ({ ...m, ...Object.fromEntries(ids.map((id) => [id, { status: "present" as const, note: "" }])) }));
    setRows((r) => ({ ...r, ...Object.fromEntries(ids.map((id) => [id, "saving" as const])) }));
    const res = await markAllPresent(sessionId, ids);
    setRows((r) => ({ ...r, ...Object.fromEntries(ids.map((id) => [id, res.ok ? undefined : ("error" as const)])) }));
  };

  const counts = {
    present: students.filter((s) => marks[s.id]?.status === "present").length,
    absent: students.filter((s) => marks[s.id]?.status === "absent").length,
    excused: students.filter((s) => marks[s.id]?.status === "excused").length,
  };
  const unmarked = students.length - counts.present - counts.absent - counts.excused;
  const errors = Object.values(rows).filter((r) => r === "error").length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" onClick={allPresent} disabled={unmarked === 0}>
          <Check size={18} aria-hidden />
          {tr.session.allPresent}
        </Button>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border bg-bg">
        {students.map((s) => {
          const mark = marks[s.id];
          const state = rows[s.id];
          return (
            <li key={s.id} className="px-3 py-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-text">{s.fullName}</span>
                  {s.atRisk && <span className="shrink-0 text-xs text-at-risk">{tr.studentStatus.at_risk}</span>}
                  {state === "saving" && <Loader2 size={14} className="shrink-0 animate-spin text-text-muted" aria-label={tr.session.saving} />}
                </div>
                <div className="grid grid-cols-3 gap-1 sm:w-80" role="group" aria-label={s.fullName}>
                  {options.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={mark?.status === o.value}
                      onClick={() => choose(s.id, o.value)}
                      className={cn(
                        "min-h-11 rounded-lg border text-sm font-medium transition-colors",
                        mark?.status === o.value ? o.on : "border-border bg-bg text-text hover:bg-surface",
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {mark?.status === "excused" && (
                <input
                  type="text"
                  defaultValue={mark.note}
                  placeholder={tr.session.excuseNote}
                  maxLength={500}
                  className={cn(inputClass, "mt-2")}
                  onBlur={(e) => {
                    const note = e.currentTarget.value;
                    if (note === mark.note) return;
                    const next = { status: "excused" as const, note };
                    setMarks((m) => ({ ...m, [s.id]: next }));
                    void save(s.id, next);
                  }}
                />
              )}
              {state === "error" && (
                <p className="mt-2 flex items-center gap-2 text-sm text-absent">
                  <AlertCircle size={16} aria-hidden />
                  {tr.session.notSaved}
                  <button type="button" className="font-medium underline" onClick={() => mark && save(s.id, mark)}>
                    {tr.session.retry}
                  </button>
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <QuickAdd
        teamId={teamId}
        onAdded={(id, fullName) => {
          setStudents((list) => [...list, { id, fullName, atRisk: false }].sort((a, b) => a.fullName.localeCompare(b.fullName, "tr")));
          const mark = { status: "present" as const, note: "" };
          setMarks((m) => ({ ...m, [id]: mark }));
          void save(id, mark);
        }}
      />

      <div className="fixed inset-x-0 bottom-14 z-10 border-t border-border bg-bg px-4 py-3 md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className="text-sm tabular-nums text-text">
            <span className="text-present">{tr.attendance.present} {counts.present}</span>
            {" · "}
            <span className="text-absent">{tr.attendance.absent} {counts.absent}</span>
            {" · "}
            <span className="text-excused">{tr.attendance.excused} {counts.excused}</span>
            {" · "}
            <span className="text-text-muted">{tr.attendance.unmarked} {unmarked}</span>
            {errors > 0 && <span className="ml-2 font-medium text-absent">· {errors} {tr.session.notSaved.toLowerCase()}</span>}
          </p>
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              router.push(doneHref);
              router.refresh();
            }}
          >
            {busy && errors === 0 ? tr.session.saving : tr.common.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuickAdd({ teamId, onAdded }: { teamId: string; onAdded: (id: string, fullName: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 flex min-h-11 items-center gap-2 text-sm font-medium text-brand-strong">
        <UserPlus size={18} aria-hidden />
        {tr.session.addMissingStudent}
      </button>
    );
  }
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const res = await quickAddStudent(teamId, name);
        setPending(false);
        if (!res.ok) return setError(res.error);
        onAdded(res.id, res.fullName);
        setName("");
        setOpen(false);
      }}
    >
      <input autoFocus required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder={tr.session.fullName} className={inputClass} />
      <Button type="submit" disabled={pending}>{tr.session.add}</Button>
      {error && <p className="text-sm text-absent">{error}</p>}
    </form>
  );
}
