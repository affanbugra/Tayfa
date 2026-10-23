// Gerçek dosyanın düzenini ve kirli veri örneklerini taklit eden sahte workbook. Tüm kişiler uydurmadır.
import * as XLSX from "xlsx";

/** Checksum'ı geçerli sahte TC üretir. */
export function fakeTc(first9: string): string {
  const d = first9.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  const d11 = (d.reduce((a, b) => a + b, 0) + d10) % 10;
  return `${first9}${d10}${d11}`;
}

export const TC_A = fakeTc("123456780");
export const TC_B = fakeTc("234567891");
export const TC_C = fakeTc("345678912");
export const TC_D = fakeTc("456789123");

function setCell(ws: XLSX.WorkSheet, a1: string, cell: XLSX.CellObject) {
  ws[a1] = cell;
}

export function buildFakeWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Kullanım talimatı"]]), "Notlar ");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Şablon"]]), "Şablon");

  const ws: XLSX.WorkSheet = {};
  const s = (a1: string, v: string | number) => setCell(ws, a1, typeof v === "number" ? { t: "n", v } : { t: "s", v });

  s("D5", "Deneme Anadolu Lisesi");
  // Yoklama başlıkları: L Şenlik (şablondan 2025), M Liderlik metin tarih, N "Fotoğraf, Liderlik" tarihsiz,
  // O boş şablon sütunu, P Notlar
  s("L7", "Şenlik"); setCell(ws, "L8", { t: "n", v: 45935, z: "d mmmm yyyy" }); // 2025-10-05 Paz
  s("M7", "Liderlik"); s("M8", "10 EKİM");
  s("N7", "Fotoğraf, Liderlik");
  s("O7", "Havuz");
  s("P7", "Notlar");

  // Satır 9: ad yok ama şablon artığı yoklama değeri
  s("L9", "Geldi");
  // Satır 10: büyük harfli ad, TC tarih biçimli sayı, telefon 90'lı
  s("B10", "MUHAMMET ALİ DENEMEOĞLU"); s("C10", "Devam Ediyor"); s("D10", "90 535 000 00 01");
  s("E10", "Deneme Anadolu Lisesi"); s("F10", 10);
  setCell(ws, "G10", { t: "n", v: Number(TC_A), z: "d.m.yyyy" });
  s("H10", "23.8.2011"); s("I10", "0530 000 00 02"); s("J10", 123);
  s("L10", "Geldi"); s("M10", "Mazeret"); s("N10", "Gelmedi");
  ws["M10"].c = [{ a: "Lider", t: "Düğünü varmış" }] as XLSX.Comment[];
  // Satır 11: küçük harfli ad, geçersiz TC, sayısal telefon, notlu telefon
  s("B11", "haktan ılgaz"); s("C11", "devam"); s("D11", 5550000003);
  s("E11", "Deneme Anadolu Lisesi"); s("F11", "10/D"); s("G11", "58432606");
  s("I11", "5550000004(Annesinin telefonu)");
  s("L11", "Gelmedi"); s("M11", "Geldi");
  // Satır 12: çıkarıldı
  s("B12", "Zeynep Örnek"); s("C12", "Çıkarıldı"); s("L12", "Mazeret");

  // Yeni Kayıt bölümü
  // Gerçek dosyada başlık satırı 38–43 arasında değişiyor; burada 41.
  s("D40", "Yeni Kayıt");
  s("D41", "Adı Soyadı"); s("E41", "İletişim Numarası"); s("F41", "TC");
  // Ana listeyle TC üzerinden eşleşen (adı farklı yazılmış), eksik doğum tarihini tamamlamaz ama okul no çakışır
  s("D42", "Muhammet Ali Denemeoglu"); s("E42", "05350000001"); setCell(ws, "F42", { t: "n", v: Number(TC_A) });
  s("J42", "999");
  // Adla eşleşen, ana listede olmayan TC'yi tamamlar
  s("D43", "Haktan Ilgaz");
  // Ana listede olmayan yeni öğrenci
  s("D44", "ŞEYMA İNCE"); s("E44", "(535) 000 00 05"); setCell(ws, "F44", { t: "n", v: Number(TC_B) }); s("G44", "10/08/2011");

  // Sütunları kaymış satır: telefon TC sütununda, TC doğum tarihi sütununda
  s("D45", "Kaymış Satır"); s("F45", 5350000006); setCell(ws, "G45", { t: "n", v: Number(TC_C) });

  // Soyadı ayrı sütuna yazılmış satır: D ad · E soyad · F telefon · G TC · H doğum · I okul · J sınıf · K okul no
  s("D46", "AYŞE"); s("E46", "BÖLÜNMÜŞ"); s("F46", "0535 000 00 07"); s("G46", TC_D);
  setCell(ws, "H46", { t: "n", v: 40780, z: "d.m.yyyy" }); s("I46", "İTMTAL"); s("J46", 10); s("K46", 77);

  ws["!ref"] = "A1:P46";
  XLSX.utils.book_append_sheet(wb, ws, "DENEME LİDER 10");

  // Ana listesi boş, öğrencileri sadece Yeni Kayıt'ta olan ekip; L'de şablon artığı
  const ws2: XLSX.WorkSheet = {};
  ws2["L7"] = { t: "s", v: "Şenlik" };
  ws2["L9"] = { t: "s", v: "Geldi" };
  ws2["D38"] = { t: "s", v: "Adı Soyadı" };
  ws2["D39"] = { t: "s", v: "Elif Deneme" };
  ws2["!ref"] = "A1:M42";
  XLSX.utils.book_append_sheet(wb, ws2, "İKİNCİ LİDER 11");

  // 9. satırda gerçek öğrenci var; şablondan kalan tek "Geldi" sadece orada (L), M gerçek yoklama
  const ws3: XLSX.WorkSheet = {};
  ws3["B9"] = { t: "s", v: "İlk Öğrenci" };
  ws3["B10"] = { t: "s", v: "İkinci Öğrenci" };
  ws3["L7"] = { t: "s", v: "Fotoğraf" };
  ws3["L9"] = { t: "s", v: "Geldi" };
  ws3["M7"] = { t: "s", v: "Liderlik" };
  ws3["M8"] = { t: "s", v: "11 Ekim" };
  ws3["M9"] = { t: "s", v: "Geldi" };
  ws3["M10"] = { t: "s", v: "Gelmedi" };
  ws3["!ref"] = "A1:M10";
  XLSX.utils.book_append_sheet(wb, ws3, "ÜÇÜNCÜ LİDER 10");
  return wb;
}

/** Diske yazıp geri okuyarak gerçek dosya yolunu taklit eder. */
export function roundTrip(wb: XLSX.WorkBook): XLSX.WorkBook {
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return XLSX.read(buf, { type: "array" });
}
