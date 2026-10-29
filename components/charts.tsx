"use client";

// Hafif SVG grafikler (bağımlılık yok). Kurallar: ince işaretler, 4px yuvarlak veri ucu, 2px çizgi,
// soluk ızgara, seçici etiket, üzerine gelince ipucu. Renkler globals.css'teki --chart-* token'ları.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const pct = (v: number | null) => (v === null ? "—" : `%${Math.round(v * 100)}`);

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Tip({ x, y, children, width }: { x: number; y: number; children: ReactNode; width: number }) {
  // Kenara taşmasın: sağ yarıdaysa sola aç.
  const left = x > width / 2;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs whitespace-nowrap text-text shadow-sm"
      style={{ top: Math.max(0, y - 8), left: left ? undefined : x + 12, right: left ? width - x + 12 : undefined, transform: "translateY(-100%)" }}
    >
      {children}
    </div>
  );
}

/** Kart içi küçük eğilim çizgisi: soluk çizgi, son nokta vurgulu. */
export function Sparkline({ values, label }: { values: (number | null)[]; label: string }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (pts.length < 2) return null;
  const W = 96;
  const H = 28;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const x = (i: number) => 3 + (i / Math.max(1, values.length - 1)) * (W - 6);
  const y = (v: number) => (max === min ? H / 2 : 3 + (1 - (v - min) / (max - min)) * (H - 6));
  const d = pts.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="shrink-0">
      <path d={d} fill="none" stroke="var(--chart-muted)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last.i)} cy={y(last.v)} r={4} fill="var(--chart-1)" stroke="var(--bg)" strokeWidth={2} />
    </svg>
  );
}

export type LineSeries = { name: string; color: string; values: (number | null)[] };

/** Zaman içinde oran (0–%100). Tek eksen, artı imleç ve ipucu, uçta doğrudan etiket. */
export function RateLineChart({ labels, series, height = 240, caption }: { labels: string[]; series: LineSeries[]; height?: number; caption: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 36;
  const padR = series.length > 1 ? 100 : 44;
  const padT = 12;
  const padB = 24;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padT - padB;
  const n = labels.length;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padT + (1 - v) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 64))));

  const path = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null) return void (pen = false);
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };

  return (
    <figure className="m-0">
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={caption}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const px = e.clientX - r.left;
              const i = n <= 1 ? 0 : Math.round(((px - padL) / innerW) * (n - 1));
              setHover(Math.min(n - 1, Math.max(0, i)));
            }}
            onPointerLeave={() => setHover(null)}
            className="touch-pan-y"
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={padL + innerW} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
                <text x={padL - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-text-muted text-[11px]">
                  %{t * 100}
                </text>
              </g>
            ))}
            {labels.map((l, i) =>
              i % every === 0 || i === n - 1 ? (
                <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-text-muted text-[11px]">
                  {l}
                </text>
              ) : null,
            )}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="var(--chart-muted)" strokeWidth={1} />}
            {series.map((s) => (
              <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {series.map((s) => {
              const i = hover ?? lastIndex(s.values);
              const v = i === -1 ? null : s.values[i];
              return v === null || v === undefined ? null : <circle key={s.name} cx={x(i)} cy={y(v)} r={4} fill={s.color} stroke="var(--bg)" strokeWidth={2} />;
            })}
            {/* Uçta doğrudan etiket (çakışırsa aşağıdakini kaydır) */}
            {endLabels(series, y).map((l) => (
              <text key={l.name} x={padL + innerW + 8} y={l.y} dy="0.32em" className="fill-text text-[11px] font-semibold">
                {series.length > 1 ? `${l.name} ` : ""}
                {pct(l.v)}
              </text>
            ))}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tip x={x(hover)} y={padT + 4} width={width}>
            <p className="font-semibold">{labels[hover]}</p>
            {series.map((s) => (
              <p key={s.name} className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} />
                {series.length > 1 && <span className="text-text-muted">{s.name}</span>}
                <span className="font-semibold">{pct(s.values[hover] ?? null)}</span>
              </p>
            ))}
          </Tip>
        )}
      </div>
      {series.length > 1 && (
        <figcaption className="mt-1 flex flex-wrap gap-4 text-xs text-text-muted">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <DataTable caption={caption} head={["Hafta", ...series.map((s) => s.name)]} rows={labels.map((l, i) => [l, ...series.map((s) => pct(s.values[i] ?? null))])} />
    </figure>
  );
}

function lastIndex(vals: (number | null)[]) {
  for (let i = vals.length - 1; i >= 0; i--) if (vals[i] !== null) return i;
  return -1;
}

function endLabels(series: LineSeries[], y: (v: number) => number) {
  const ls = series
    .map((s) => {
      const i = lastIndex(s.values);
      const v = i === -1 ? null : s.values[i];
      return v === null ? null : { name: s.name, v, y: y(v) };
    })
    .filter((l): l is { name: string; v: number; y: number } => l !== null)
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < ls.length; k++) if (ls[k].y - ls[k - 1].y < 14) ls[k].y = ls[k - 1].y + 14;
  return ls;
}

export type BarRow = { label: string; value: number | null; detail: string; href?: string };

/** Yatay çubuklar, yüksekten düşüğe. Tek seri tek renk; program ortalaması çizgisi; değer çubuğun ucunda. */
export function RateBars({ rows, average, averageLabel, caption }: { rows: BarRow[]; average: number | null; averageLabel: string; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <figure className="m-0">
      <ul className="space-y-1" aria-label={caption}>
        {rows.map((r, i) => {
          const body = (
            <div className="grid grid-cols-[minmax(0,9.5rem)_1fr] items-center gap-3 py-0.5">
              <span className="truncate text-xs text-text" title={r.label}>{r.label}</span>
              <span className="relative flex h-5 items-center">
                {average !== null && <span aria-hidden className="absolute inset-y-[-3px] w-px bg-text-muted" style={{ left: `${average * 100}%` }} />}
                <span
                  className={cn("h-3.5 rounded-r-[4px] transition-opacity", hover !== null && hover !== i && "opacity-50")}
                  style={{ width: `${(r.value ?? 0) * 100}%`, background: "var(--chart-1)" }}
                />
                <span className="ml-1.5 text-xs font-semibold text-text">{pct(r.value)}</span>
              </span>
            </div>
          );
          return (
            <li key={r.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} title={r.detail} className="rounded hover:bg-surface">
              {r.href ? <a href={r.href} className="block px-1">{body}</a> : <div className="px-1">{body}</div>}
            </li>
          );
        })}
      </ul>
      {average !== null && (
        <figcaption className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
          <span aria-hidden className="inline-block h-3 w-px bg-text-muted" />
          {averageLabel} {pct(average)}
        </figcaption>
      )}
      <DataTable caption={caption} head={["Ekip", "Katılım", "Ayrıntı"]} rows={rows.map((r) => [r.label, pct(r.value), r.detail])} />
    </figure>
  );
}

export type ColumnItem = { label: string; sub: string; value: number | null; detail: string };

/** Buluşma başına katılım sütunları (lider). Program ortalaması yatay çizgi; sadece son değer etiketli. */
export function RateColumns({ items, average, averageLabel, height = 120, caption }: { items: ColumnItem[]; average: number | null; averageLabel: string; height?: number; caption: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padT = 18;
  const padB = 18;
  const innerH = height - padT - padB;
  const n = items.length;
  const slot = n ? width / n : 0;
  const bw = Math.min(24, Math.max(6, slot * 0.6));
  const cx = (i: number) => slot * i + slot / 2;
  const y = (v: number) => padT + (1 - v) * innerH;
  const last = n - 1;

  return (
    <figure className="m-0">
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={caption} onPointerLeave={() => setHover(null)}>
            <line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke="var(--chart-grid)" strokeWidth={1} />
            {items.map((it, i) => {
              const v = it.value ?? 0;
              const top = y(v);
              const h = y(0) - top;
              const r = Math.min(4, h, bw / 2);
              const x0 = cx(i) - bw / 2;
              // Üst köşeler 4px yuvarlak, taban düz.
              const d = `M${x0},${y(0)} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${y(0)} Z`;
              return (
                <g key={i} onPointerEnter={() => setHover(i)}>
                  <rect x={slot * i} y={0} width={slot} height={height} fill="transparent" />
                  {it.value !== null && h > 0 && <path d={d} fill="var(--chart-1)" opacity={hover !== null && hover !== i ? 0.5 : 1} />}
                  {i === last && it.value !== null && (
                    <text x={cx(i)} y={top - 5} textAnchor="middle" className="fill-text text-[11px] font-semibold">{pct(it.value)}</text>
                  )}
                  {(i === 0 || i === last || n <= 8) && (
                    <text x={cx(i)} y={height - 4} textAnchor="middle" className="fill-text-muted text-[10px]">{it.label}</text>
                  )}
                </g>
              );
            })}
            {average !== null && <line x1={0} x2={width} y1={y(average)} y2={y(average)} stroke="var(--chart-muted)" strokeWidth={1} />}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tip x={cx(hover)} y={y(items[hover].value ?? 0)} width={width}>
            <p className="font-semibold">{items[hover].label} · {items[hover].sub}</p>
            <p>{pct(items[hover].value)} <span className="text-text-muted">({items[hover].detail})</span></p>
          </Tip>
        )}
      </div>
      {average !== null && (
        <figcaption className="mt-1 flex items-center gap-1.5 text-[11px] text-text-muted">
          <span aria-hidden className="inline-block h-px w-3 bg-text-muted" />
          {averageLabel} {pct(average)}
        </figcaption>
      )}
      <DataTable caption={caption} head={["Buluşma", "Etkinlik", "Katılım"]} rows={items.map((it) => [it.label, it.sub, `${pct(it.value)} (${it.detail})`])} />
    </figure>
  );
}

/** Parça-bütün: tek yığılmış çubuk, 2px boşluklu, etiketli. */
export function SplitBar({ parts, caption }: { parts: { label: string; value: number; color: string }[]; caption: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return <p className="text-sm text-text-muted">—</p>;
  return (
    <figure className="m-0">
      <div className="flex h-3 gap-0.5" role="img" aria-label={`${caption}: ${parts.map((p) => `${p.label} ${p.value}`).join(", ")}`}>
        {parts.filter((p) => p.value > 0).map((p, i, arr) => (
          <span
            key={p.label}
            className={cn(i === 0 && "rounded-l-[4px]", i === arr.length - 1 && "rounded-r-[4px]")}
            style={{ flexGrow: p.value, background: p.color }}
            title={`${p.label}: ${p.value}`}
          />
        ))}
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} <span className="font-semibold">{p.value}</span>
            <span className="text-text-muted">%{Math.round((p.value / total) * 100)}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <details className="mt-2 text-xs text-text-muted">
      <summary className="cursor-pointer select-none hover:text-text">Tablo olarak göster</summary>
      <div className="mt-2 max-h-56 overflow-auto rounded border border-border">
        <table className="w-full text-left text-text">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface">
            <tr>{head.map((h) => <th key={h} className="px-2 py-1 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className="px-2 py-1 whitespace-nowrap">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
