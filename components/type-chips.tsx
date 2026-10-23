import type { ActivityType } from "@/lib/data/queries";

/** Çoklu seçimli etkinlik türü çipleri (form içinde checkbox). */
export function TypeChips({ types, selected }: { types: ActivityType[]; selected: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {types.map((t) => (
        <label key={t.id} className="cursor-pointer">
          <input type="checkbox" name="typeIds" value={t.id} defaultChecked={selected.includes(t.id)} className="peer sr-only" />
          <span className="inline-flex min-h-10 items-center rounded-lg border border-border bg-bg px-3 text-sm text-text peer-checked:border-brand-strong peer-checked:bg-brand-tint peer-checked:font-medium peer-checked:text-brand-strong peer-focus-visible:outline-2 peer-focus-visible:outline-brand-strong">
            {t.name}
          </span>
        </label>
      ))}
    </div>
  );
}
