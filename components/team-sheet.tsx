"use client";

// Ekip tablosu: Excel'deki lider sayfasının karşılığı. Satırlar öğrenciler, sütunlar buluşmalar.
// Hücreye dokunmak işareti döndürür (Geldi → Gelmedi → Mazeret → boş) ve anında kaydeder.
import { AlertCircle, Copy, Download, Pencil, Plus, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { quickAddStudent, removeSession, saveSession, setAttendance } from "@/app/actions/attendance";
import { setStudentStatus } from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { SheetMark, SheetSession, SheetStudent } from "@/lib/data/sheet";
import type { AttendanceStatus } from "@/lib/data/queries";
import { isCurrent, type StudentStatus } from "@/lib/students";
import { addDaysIso, formatDateShort } from "@/lib/dates";
import { tr } from "@/lib/i18n/tr";

type Status = AttendanceStatus;
type Type = { id: string; name: string };
type CellState = "saving" | "error";

const next: Record<Status | "none", Status | null> = { none: "present", present: "absent", absent: "excused", excused: null };
const look: Record<Status, string> = {
  present: "bg-present-bg text-present",
  absent: "bg-absent-bg text-absent",
  excused: "bg-excused-bg text-excused",
};
const statusLook: Record<StudentStatus, string> = {
  active: "border border-border bg-bg text-text-muted",
  at_risk: "bg-excused-bg text-excused",
  left: "border border-border bg-bg text-removed",
  removed: "border border-border bg-bg text-removed",
};
const weekday = (iso: string) => new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export function TeamSheet({
  teamId,
  students,
  sessions,
  marks: serverMarks,
  types,
  today,
  defaultDate,
  defaultTypeIds,
  teamQuery,
  exportHref,
  stats,
}: {
  teamId: string;
  students: SheetStudent[];
  sessions: SheetSession[];
  marks: Record<string, SheetMark>;
  types: Type[];
  today: string;
  defaultDate: string;
  /** Yönetimin bu hafta için planladığı türler: yeni buluşmada seçili gelir */
  defaultTypeIds: string[];
  /** Yöneticide "?ekip=…", liderde boş: öğrenci sayfası bağlantılarına eklenir */
  teamQuery: string;
  exportHref: string;
  /** Araç çubuğunun yanındaki küçük istatistik etiketleri */
  stats?: ReactNode;
}) {
  const router = useRouter();
  // Sunucudan gelen işaretlerin üstüne, bu ekranda yapılan değişiklikler yazılır (null = silindi).
  const [overrides, setOverrides] = useState<Record<string, SheetMark | null>>({});
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [statusOf, setStatusOf] = useState<Record<string, StudentStatus>>({});
  const [editor, setEditor] = useState<SheetSession | "new" | null>(null);
  const [noteFor, setNoteFor] = useState<{ studentId: string; sessionId: string } | null>(null);
  const [statusFor, setStatusFor] = useState<SheetStudent | null>(null);
  const [adding, setAdding] = useState(false);
  const versions = useRef<Record<string, number>>({});
  const scroller = useRef<HTMLDivElement>(null);

  const markOf = (studentId: string, sessionId: string): SheetMark | null => {
    const key = `${studentId}:${sessionId}`;
    return key in overrides ? overrides[key] : (serverMarks[key] ?? null);
  };
  const statusOfStudent = (s: SheetStudent) => statusOf[s.id] ?? s.status;

  // En yeni buluşmalar sağda; açılışta oraya kaydır.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [sessions.length]);

  const busy = Object.values(cells).includes("saving");
  useEffect(() => {
    if (!busy) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy]);

  async function write(studentId: string, sessionId: string, mark: SheetMark | null) {
    const key = `${studentId}:${sessionId}`;
    const version = (versions.current[key] ?? 0) + 1;
    versions.current[key] = version;
    setOverrides((o) => ({ ...o, [key]: mark }));
    setCells((c) => ({ ...c, [key]: "saving" }));
    const res = await setAttendance({ sessionId, studentId, status: mark?.status ?? null, excuseNote: mark?.note ?? null });
    if (versions.current[key] !== version) return; // daha yeni bir dokunuş var
    setCells((c) => {
      const rest = { ...c };
      delete rest[key];
      return res.ok ? rest : { ...rest, [key]: "error" };
    });
  }

  function cycle(studentId: string, sessionId: string) {
    const key = `${studentId}:${sessionId}`;
    const current = markOf(studentId, sessionId);
    // Kaydedilemeyen hücreye dokunmak önce aynı değeri tekrar dener.
    if (cells[key] === "error") return void write(studentId, sessionId, current);
    const status = next[current?.status ?? "none"];
    void write(studentId, sessionId, status ? { status, note: status === "excused" ? (current?.note ?? null) : null } : null);
  }

  // Ekipte olanlar üstte; ayrılan ve çıkarılanlar en altta, soluk (Excel'deki "Devam Durumu" gibi).
  const current = students.filter((s) => isCurrent(statusOfStudent(s)));
  const gone = students.filter((s) => !isCurrent(statusOfStudent(s)));

  // Planlanmış (ileri tarihli) buluşmalar görünür ama günü gelene kadar işaretlenmez ve sayılmaz.
  const isFuture = (se: SheetSession) => se.date > today;
  const absences = (studentId: string) =>
    sessions.reduce((n, se) => n + (se.status === "held" && !isFuture(se) && markOf(studentId, se.id)?.status === "absent" ? 1 : 0), 0);
  const lastHeld = [...sessions].reverse().find((s) => s.status === "held" && !isFuture(s));
  const errors = Object.values(cells).filter((c) => c === "error").length;

  const row = (s: SheetStudent) => {
    const abs = absences(s.id);
    const status = statusOfStudent(s);
    const out = !isCurrent(status);
    const pill = (
      <button
        type="button"
        onClick={() => setStatusFor({ ...s, status })}
        aria-label={`${s.full_name}: ${tr.sheet.changeStatus} (${tr.studentStatus[status]})`}
        className={cn("inline-flex h-6 shrink-0 items-center rounded px-1.5 text-[11px] font-semibold whitespace-nowrap", statusLook[status])}
      >
        {tr.studentStatusShort[status]}
      </button>
    );
    return (
      <tr key={s.id} className={out ? "text-removed" : undefined}>
        <td className={cn("sticky left-0 z-10 border-r border-b border-border px-2 py-0.5 md:px-3", out ? "bg-surface" : "bg-bg")}>
          <Link href={`/ogrenciler/${s.id}${teamQuery}`} className="block truncate text-[13px] leading-5 font-medium hover:text-brand-strong md:text-sm">
            {s.full_name}
          </Link>
          <span className="flex items-center gap-1.5 md:hidden">
            {pill}
            {!out && <span className={cn("truncate text-[11px]", abs >= 3 ? "font-semibold text-absent" : "text-text-muted")}>{tr.sheet.absencesUnder(abs)}</span>}
          </span>
        </td>
        <Td className="hidden md:table-cell">{pill}</Td>
        <Td className="hidden md:table-cell">{s.phone ? <Phone value={s.phone} /> : <Muted />}</Td>
        <Td className="hidden md:table-cell">{s.parent_phone ? <Phone value={s.parent_phone} /> : <Muted />}</Td>
        <Td className="hidden max-w-44 truncate lg:table-cell" title={s.school ?? undefined}>{s.school ?? <Muted />}</Td>
        <Td className="hidden lg:table-cell">{s.class_label ?? <Muted />}</Td>
        <Td className={cn("hidden border-r text-center font-semibold md:table-cell", abs >= 3 && !out && "text-absent")}>{abs}</Td>
        {sessions.map((se) => {
          const key = `${s.id}:${se.id}`;
          const mark = markOf(s.id, se.id);
          const state = cells[key];
          const last = se.id === lastHeld?.id;
          if (se.status !== "held") return <td key={se.id} className="border-b border-border bg-surface" />;
          if (isFuture(se)) return <td key={se.id} className="border-b border-border bg-accent-tint/50" aria-label={tr.sheet.plannedCell} />;
          return (
            <td key={se.id} className={cn("border-b border-border px-0.5 py-0.5 md:px-1", last && "bg-brand-tint")}>
              <div className="group/cell relative">
                <button
                  type="button"
                  onClick={() => cycle(s.id, se.id)}
                  aria-label={`${s.full_name}, ${formatDateShort(se.date)}: ${mark ? tr.attendance[mark.status] : tr.sheet.cellEmpty}`}
                  title={mark?.note ?? undefined}
                  className={cn(
                    "flex h-9 w-full items-center justify-center rounded-md text-xs font-semibold transition-colors md:h-10 md:text-[13px]",
                    mark ? look[mark.status] : "border border-dashed border-border text-text-muted hover:bg-surface",
                    out && "opacity-60",
                    state === "saving" && "opacity-60",
                    state === "error" && "ring-2 ring-absent",
                  )}
                >
                  {mark ? tr.attendance[mark.status] : "—"}
                </button>
                {mark?.status === "excused" && (
                  <button
                    type="button"
                    onClick={() => setNoteFor({ studentId: s.id, sessionId: se.id })}
                    aria-label={`${tr.sheet.excuseTitle}: ${s.full_name}`}
                    title={mark.note ?? tr.sheet.excuseTitle}
                    className={cn(
                      // Excel'deki yorum işareti gibi köşede üçgen. Not yoksa fareyle üstüne gelince görünür.
                      "absolute top-0 right-0 flex size-6 items-start justify-end",
                      !mark.note && "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/cell:opacity-100 focus-visible:opacity-100",
                    )}
                  >
                    <span className={cn("block size-2.5 rounded-tr-md [clip-path:polygon(0_0,100%_0,100%_100%)]", mark.note ? "bg-excused" : "bg-text-muted/50")} />
                  </button>
                )}
              </div>
            </td>
          );
        })}
        <td className="border-b border-border" />
      </tr>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tek satır: düğmeler solda, istatistik etiketleri yanında (telefonda yana kayar) */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 md:px-6">
        <Button type="button" onClick={() => setEditor("new")} className="min-h-10 shrink-0 px-3">
          <Plus size={18} aria-hidden />
          <span className="md:hidden">{tr.sheet.newSessionShort}</span>
          <span className="hidden md:inline">{tr.sheet.newSession}</span>
        </Button>
        <button type="button" onClick={() => setAdding(true)} aria-label={tr.sheet.addStudent} title={tr.sheet.addStudent} className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-text hover:bg-surface">
          <UserPlus size={18} aria-hidden />
        </button>
        <a href={exportHref} aria-label={tr.team.downloadExcel} title={tr.team.downloadExcel} className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-text hover:bg-surface">
          <Download size={18} aria-hidden />
        </a>
        {stats && <div className="-mr-4 min-w-0 flex-1 overflow-x-auto pr-4 md:mr-0 md:pr-0">{stats}</div>}
      </div>
      {errors > 0 && (
        <p className="mx-4 mt-2 flex items-center gap-2 rounded-lg bg-absent-bg px-3 py-2 text-sm text-absent md:mx-6" role="alert">
          <AlertCircle size={16} aria-hidden />
          {errors} hücre kaydedilmedi. Kırmızı çerçeveli hücreye tekrar dokun.
        </p>
      )}

      {/* Tablo */}
      <div className="min-h-0 flex-1 px-0 pb-4 md:px-6 md:pt-2">
        <div ref={scroller} className="max-h-[calc(100dvh-150px)] overflow-auto border-b border-border bg-bg md:rounded-lg md:border">
          <table className="border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <Th className="sticky left-0 z-30 w-36 min-w-36 border-r md:w-52 md:min-w-52">{tr.sheet.name}</Th>
                <Th className="hidden md:table-cell">{tr.sheet.statusCol}</Th>
                <Th className="hidden min-w-40 md:table-cell">{tr.sheet.phone}</Th>
                <Th className="hidden min-w-32 md:table-cell">{tr.sheet.parent}</Th>
                <Th className="hidden min-w-44 lg:table-cell">{tr.sheet.school}</Th>
                <Th className="hidden min-w-16 lg:table-cell">{tr.sheet.cls}</Th>
                <Th className="hidden min-w-20 border-r text-center md:table-cell">{tr.sheet.absences}</Th>
                {sessions.map((se) => (
                  <th key={se.id} className={cn("sticky top-0 z-20 border-b border-border p-0 text-left align-bottom font-normal", se.id === lastHeld?.id ? "bg-brand-tint shadow-[inset_0_3px_0_var(--accent)]" : "bg-surface")}>
                    <button type="button" onClick={() => setEditor(se)} className="group block w-[78px] px-1.5 py-1.5 text-left md:w-[104px] md:px-2 md:py-2" aria-label={`${tr.sheet.editSession}: ${formatDateShort(se.date)}`}>
                      <span className="flex items-center justify-between gap-1 text-xs font-semibold text-text md:text-[13px]">
                        <span>
                          {formatDateShort(se.date)} <span className="hidden font-normal text-text-muted md:inline">{weekday(se.date)}</span>
                        </span>
                        <Pencil size={11} className="shrink-0 text-text-muted opacity-60 group-hover:opacity-100" aria-hidden />
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-text-muted md:text-xs">
                        {se.status !== "held" ? tr.sheet.notHeld[se.status] : se.types.join(", ") || tr.common.none}
                      </span>
                      {isFuture(se) && se.status === "held" && (
                        <span className="mt-1 inline-block rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-text">{tr.sheet.planned}</span>
                      )}
                    </button>
                  </th>
                ))}
                <th className="sticky top-0 z-20 w-full border-b border-border bg-surface" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {current.map(row)}
              {gone.length > 0 && (
                <tr>
                  <td className="sticky left-0 z-10 border-r border-b border-border bg-surface px-2 py-1 text-[11px] font-semibold text-text-muted md:px-3">
                    {tr.sheet.goneTitle} ({gone.length})
                  </td>
                  <td colSpan={sessions.length + 7} className="border-b border-border bg-surface" />
                </tr>
              )}
              {gone.map(row)}
            </tbody>
            {sessions.length > 0 && current.length > 0 && (
              <tfoot>
                <tr>
                  <td className="sticky bottom-0 left-0 z-30 border-r border-border bg-surface px-2 py-1.5 text-xs font-semibold text-text-muted md:px-3">{tr.sheet.total}</td>
                  <td className="sticky bottom-0 z-20 hidden bg-surface md:table-cell" />
                  <td className="sticky bottom-0 z-20 hidden bg-surface md:table-cell" />
                  <td className="sticky bottom-0 z-20 hidden bg-surface md:table-cell" />
                  <td className="sticky bottom-0 z-20 hidden bg-surface lg:table-cell" />
                  <td className="sticky bottom-0 z-20 hidden bg-surface lg:table-cell" />
                  <td className="sticky bottom-0 z-20 hidden border-r border-border bg-surface md:table-cell" />
                  {sessions.map((se) => {
                    const present = current.filter((s) => markOf(s.id, se.id)?.status === "present").length;
                    return (
                      <td key={se.id} className="sticky bottom-0 z-20 bg-surface px-1 py-1.5 text-center text-xs font-semibold text-text">
                        {se.status === "held" && !isFuture(se) ? `${present}/${current.length}` : tr.common.none}
                      </td>
                    );
                  })}
                  <td className="sticky bottom-0 z-20 bg-surface" />
                </tr>
              </tfoot>
            )}
          </table>
          {students.length === 0 && <p className="p-6 text-sm text-text-muted">{tr.sheet.noStudents}</p>}
          {students.length > 0 && sessions.length === 0 && <p className="p-6 text-sm text-text-muted">{tr.sheet.noSessions}</p>}
        </div>
      </div>

      {statusFor && (
        <StatusEditor
          student={statusFor}
          onClose={() => setStatusFor(null)}
          onSaved={(status) => {
            setStatusOf((m) => ({ ...m, [statusFor.id]: status }));
            setStatusFor(null);
            router.refresh();
          }}
        />
      )}
      {editor && (
        <SessionEditor
          teamId={teamId}
          session={editor === "new" ? null : editor}
          types={types}
          today={today}
          defaultDate={defaultDate}
          defaultTypeIds={defaultTypeIds}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            router.refresh();
          }}
        />
      )}
      {noteFor && (
        <NoteEditor
          initial={markOf(noteFor.studentId, noteFor.sessionId)?.note ?? ""}
          onClose={() => setNoteFor(null)}
          onSave={(note) => {
            void write(noteFor.studentId, noteFor.sessionId, { status: "excused", note: note.trim() || null });
            setNoteFor(null);
          }}
        />
      )}
      {adding && (
        <AddStudent
          teamId={teamId}
          fullHref={`/ogrenciler/yeni${teamQuery}`}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn("sticky top-0 z-20 border-b border-border bg-surface px-3 py-2 text-left align-bottom text-xs font-semibold text-text-muted", className)}>
      {children}
    </th>
  );
}

function Td({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <td title={title} className={cn("border-b border-border px-3 py-1 whitespace-nowrap", className)}>
      {children}
    </td>
  );
}

function Muted() {
  return <span className="text-text-muted">{tr.common.none}</span>;
}

function Phone({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  const pretty = /^\d{10}$/.test(value) ? `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6, 8)} ${value.slice(8)}` : value;
  return (
    <span className="flex items-center gap-1">
      <a href={`tel:0${value}`} className="hover:text-brand-strong">{pretty}</a>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        }}
        aria-label={`${tr.students.copy}: ${pretty}`}
        className="flex size-7 items-center justify-center rounded-md text-text-muted hover:bg-surface"
      >
        {done ? <span className="text-[10px] font-semibold text-present">{tr.students.copied}</span> : <Copy size={14} aria-hidden />}
      </button>
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-t-xl bg-bg p-5 shadow-lg sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <button type="button" onClick={onClose} aria-label={tr.common.cancel} className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface">
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SessionEditor({
  teamId,
  session,
  types,
  today,
  defaultDate,
  defaultTypeIds,
  onClose,
  onSaved,
}: {
  teamId: string;
  session: SheetSession | null;
  types: Type[];
  today: string;
  defaultDate: string;
  defaultTypeIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(session?.date ?? defaultDate);
  const [typeIds, setTypeIds] = useState<string[]>(session?.typeIds ?? defaultTypeIds);
  const [status, setStatus] = useState(session?.status ?? "held");
  const [note, setNote] = useState(session?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const res = await saveSession({ sessionId: session?.id, teamId, date, status, typeIds, note });
    setPending(false);
    if (!res.ok) return setError(res.error);
    onSaved();
  }

  async function destroy() {
    if (!session) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setPending(true);
    const res = await removeSession(session.id);
    setPending(false);
    if (!res.ok) return setError(res.error);
    onSaved();
  }

  return (
    <Modal title={session ? tr.sheet.editSession : tr.sheet.newSession} onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-text">{tr.session.date}</span>
          <input type="date" value={date} max={addDaysIso(today, 90)} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </label>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-text">
            {tr.session.types} <span className="font-normal text-text-muted">· {tr.session.typesHint}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => {
              const on = typeIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTypeIds((ids) => (on ? ids.filter((x) => x !== t.id) : [...ids, t.id]))}
                  className={cn("min-h-9 rounded-full border px-3 text-sm", on ? "border-brand-strong bg-brand-tint font-medium text-brand-strong" : "border-border text-text hover:bg-surface")}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-text">{tr.session.statusLabel}</legend>
          <div className="grid grid-cols-3 gap-1">
            {(["held", "postponed", "cancelled"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={cn("min-h-10 rounded-lg border text-sm", status === s ? "border-brand-strong bg-brand-tint font-medium text-brand-strong" : "border-border text-text")}
              >
                {tr.session[s]}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-text">{tr.session.note}</span>
          <input type="text" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </label>
        {error && <p className="text-sm text-absent" role="alert">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          {session ? (
            <Button type="button" variant="danger" onClick={destroy} disabled={pending}>
              {confirmDelete ? tr.sheet.deleteSure : tr.sheet.deleteSession}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={submit} disabled={pending || !date}>
            {tr.common.save}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function NoteEditor({ initial, onClose, onSave }: { initial: string; onClose: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState(initial);
  return (
    <Modal title={tr.sheet.excuseTitle} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(note);
        }}
      >
        <input autoFocus type="text" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={tr.sheet.excusePlaceholder} className={inputClass} />
        <div className="flex justify-end">
          <Button type="submit">{tr.common.save}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddStudent({ teamId, fullHref, onClose, onAdded }: { teamId: string; fullHref: string; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <Modal title={tr.sheet.addStudent} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const res = await quickAddStudent(teamId, name);
          setPending(false);
          if (!res.ok) return setError(res.error);
          onAdded();
        }}
      >
        <input autoFocus required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder={tr.session.fullName} aria-label={tr.session.fullName} className={inputClass} />
        {error && <p className="text-sm text-absent" role="alert">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          <Link href={fullHref} className="text-sm text-brand-strong hover:underline">{tr.sheet.addStudentFull}</Link>
          <Button type="submit" disabled={pending}>{tr.session.add}</Button>
        </div>
      </form>
    </Modal>
  );
}

function StatusEditor({ student, onClose, onSaved }: { student: SheetStudent; onClose: () => void; onSaved: (status: StudentStatus) => void }) {
  const [status, setStatus] = useState<StudentStatus>(student.status);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const options: StudentStatus[] = ["active", "at_risk", "left", "removed"];
  return (
    <Modal title={student.full_name} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const res = await setStudentStatus(student.id, status, reason);
          setPending(false);
          if (!res.ok) return setError(res.error);
          onSaved(status);
        }}
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text">{tr.sheet.statusCol}</legend>
          <div className="grid grid-cols-2 gap-2">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={status === o}
                onClick={() => setStatus(o)}
                className={cn("min-h-11 rounded-lg border text-sm", status === o ? "border-brand-strong bg-brand-tint font-semibold text-brand-strong" : "border-border text-text")}
              >
                {tr.studentStatus[o]}
              </button>
            ))}
          </div>
        </fieldset>
        {(status === "left" || status === "removed") && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">
              {tr.students.statusReason} {status === "left" && <span className="font-normal text-text-muted">({tr.sheet.optional})</span>}
            </span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} required={status === "removed"} maxLength={500} className={inputClass} />
            <span className="mt-1 block text-xs text-text-muted">{tr.sheet.goneHint}</span>
          </label>
        )}
        {error && <p className="text-sm text-absent" role="alert">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>{tr.common.save}</Button>
        </div>
      </form>
    </Modal>
  );
}
