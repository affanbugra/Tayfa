-- Öğrenci durumu "Ayrıldı" (left): kendi isteğiyle bırakan. "Çıkarıldı"dan (removed) farkı gerekçe zorunlu değil.
-- İkisi de ekip sayısına ve istatistiklere girmez; geçmiş yoklamaları korunur.
alter table public.students drop constraint students_status_check;
alter table public.students add constraint students_status_check check (status in ('active', 'at_risk', 'left', 'removed'));
