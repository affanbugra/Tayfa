// Excel dışa aktarma (CLAUDE.md §6.8): Türkçe başlıklar, TC metin, tarihler gerçek tarih hücresi.
import * as XLSX from "xlsx";

export type Column<T> = { header: string; value: (row: T) => string | number | Date | null; kind?: "text" | "date" | "number"; width?: number };

export function sheetFrom<T>(rows: T[], columns: Column<T>[]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  columns.forEach((c, ci) => {
    ws[XLSX.utils.encode_cell({ r: 0, c: ci })] = { t: "s", v: c.header };
  });
  rows.forEach((row, ri) => {
    columns.forEach((c, ci) => {
      const v = c.value(row);
      if (v === null || v === undefined || v === "") return;
      const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
      if (c.kind === "date" && typeof v === "string") {
        ws[addr] = { t: "d", v: new Date(`${v}T00:00:00Z`), z: "dd.mm.yyyy" };
      } else if (typeof v === "number" && c.kind !== "text") {
        ws[addr] = { t: "n", v };
      } else {
        ws[addr] = { t: "s", v: String(v) };
      }
    });
  });
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length, 1), c: Math.max(columns.length - 1, 0) } });
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? Math.max(10, c.header.length + 2) }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: columns.length - 1 } }) };
  return ws;
}

export function workbookBuffer(sheets: { name: string; sheet: XLSX.WorkSheet }[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) XLSX.utils.book_append_sheet(wb, s.sheet, s.name.slice(0, 31));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellDates: true }) as Buffer;
}

export function xlsxResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
