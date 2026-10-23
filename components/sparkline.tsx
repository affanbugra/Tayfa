/** Küçük haftalık katılım çizgisi (dataviz: tek renk, eksen yok, son nokta vurgulu). */
export function Sparkline({ values, label }: { values: (number | null)[]; label: string }) {
  const w = 64;
  const h = 20;
  const pts = values.map((v, i) => (v === null ? null : { x: (i / Math.max(values.length - 1, 1)) * (w - 4) + 2, y: h - 2 - v * (h - 4) }));
  const segments: string[] = [];
  let current = "";
  for (const p of pts) {
    if (!p) {
      if (current) segments.push(current);
      current = "";
      continue;
    }
    current += `${current ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }
  if (current) segments.push(current);
  const last = [...pts].reverse().find(Boolean);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="shrink-0">
      {segments.map((d) => (
        <path key={d} d={d} fill="none" stroke="var(--brand-strong)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {last && <circle cx={last.x} cy={last.y} r={2} fill="var(--brand-strong)" />}
    </svg>
  );
}
