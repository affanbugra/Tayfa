// Öğrenci durumu: sunucu ve tarayıcı ortak kullanır.
export type StudentStatus = "active" | "at_risk" | "left" | "removed";

/** Ekipte sayılan öğrenciler: ayrılan ve çıkarılanlar ekip sayısına ve istatistiklere girmez. */
export const isCurrent = (status: StudentStatus) => status === "active" || status === "at_risk";
