export default function PageLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Yükleniyor">
      <div className="h-7 w-56 rounded bg-surface" />
      <div className="h-40 rounded-lg border border-border bg-surface" />
      <div className="h-24 rounded-lg border border-border bg-surface" />
    </div>
  );
}
