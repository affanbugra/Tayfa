// TC Kimlik No ayrıştırma ve doğrulama. Excel'de TC hücreleri bazen tarih biçimli
// olduğundan biçimlendirilmiş metin değil, ham sayısal değer (cell.v) kullanılır.

export function tcFromCell(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return String(Math.trunc(value));
  }
  const digits = String(value).replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

export function isValidTc(tc: string | null | undefined): boolean {
  if (!tc || !/^[1-9]\d{10}$/.test(tc)) return false;
  const d = tc.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  if (d10 !== d[9]) return false;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d11 === d[10];
}
