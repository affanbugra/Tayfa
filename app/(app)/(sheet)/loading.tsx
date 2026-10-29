// Tablo yüklenirken anında görünen iskelet: tıklama "donmuş" hissettirmesin.
export default function SheetLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-label="Yükleniyor">
      <div className="px-4 pt-3 md:px-6">
        <div className="h-6 w-48 rounded bg-surface" />
      </div>
      <div className="flex gap-2 border-b border-border px-4 py-3 md:px-6">
        <div className="h-11 w-32 rounded-lg bg-surface" />
        <div className="h-11 w-28 rounded-lg bg-surface" />
        <div className="ml-auto h-11 w-24 rounded-lg bg-surface" />
      </div>
      <div className="px-0 pt-2 md:px-6">
        <div className="overflow-hidden border-y border-border md:rounded-lg md:border">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex gap-2 border-b border-border px-3 py-2 last:border-0">
              <div className="h-8 w-36 shrink-0 rounded bg-surface md:w-56" />
              {Array.from({ length: 6 }, (_, j) => (
                <div key={j} className="h-8 w-20 shrink-0 rounded bg-surface md:w-24" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
