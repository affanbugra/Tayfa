# Tayfa Yoklama — Proje Beyni

> Bu dosya, Claude Code'un bu projeyi sıfırdan inşa edip yayına alması için tek doğruluk kaynağıdır.
> Her oturumun başında baştan sona oku. Bir karar burada yazıyorsa tartışmaya açma; yazmıyorsa
> "Bekleyen Konular" bölümüne bak, orada da yoksa kullanıcıya sor.

---

## 1. Problem

**Tayfa**, Esenler Belediyesi Gençlik ve Spor Müdürlüğü'nün yürüttüğü bir liderlik programıdır.

- Üniversiteli **liderler** seçilir. Her lidere Esenler'deki liselerden **12–25 öğrencilik bir ekip** verilir.
- Ekipler **her hafta sonu** buluşur. Her ekibin günü genelde sabittir (bazı ekipler hep cumartesi,
  bazıları hep pazar; kabaca erkek ekipler cumartesi, kız ekipler pazar). Büyük etkinliklerde
  (şenlik, büyük gezi) tüm ekipler aynı gün buluşur.
- Belediye her hafta hangi etkinliğin yapılacağını belirler (film tahlili, gezi, workshop, bowling…).
  Etkinlikler belli bir **döngüyle** döner; amaç her ekibin her etkinliği yapmasıdır.
- 2026–2027 döneminde **26 ekip** var (12'si 10. sınıf, 14'ü 11. sınıf), toplam yaklaşık **430 öğrenci**.

**Bugünkü durum:** Yoklama ortak bir Google Sheets dosyasında tutuluyor. Her lidere bir sayfa
(sekme) ayrılmış. Liderler her buluşma için yeni bir sütun açıyor, etkinlik türünü ve tarihi yazıp
her öğrenci için Geldi / Gelmedi / Mazeret seçiyor. Aynı sayfa öğrenci bilgi kartı olarak da
kullanılıyor: TC, telefon ve veli numarası buradan kopyalanıyor.

**Sorunlar:**
- Telefondan kullanmak zor, arayüz yorucu ve hataya açık.
- Veri tutarsız (bkz. §9): tarihler karışık, TC numaraları tarihe dönüşmüş, durumlar elle yazılmış.
- Yönetim 26 sayfayı tek tek açmadan genel durumu göremiyor. Rapor, trend ve karşılaştırma yok.
- Hangi ekibin hangi etkinliği kaç kez yaptığı görülemediği için haftalık eşleştirme (hangi ekip bu
  hafta ne yapacak) elle ve tahmine dayalı yapılıyor.

**Hedef:** Liderlerin Google hesabıyla girip **telefondan saniyeler içinde yoklama alabildiği**,
öğrencilerini yönetebildiği; yönetimin tüm ekipleri **görsel raporlarla** izleyebildiği, kod
yazmadan **filtreleyip Excel indirebildiği** ve **eşleştirme önerileri** görebildiği, kurumsal
görünümlü bir web uygulaması.

---

## 2. Kesinleşmiş Kararlar

| Konu | Karar |
|---|---|
| Barındırma | **Vercel** (uygulama) + **Supabase** (Postgres + Auth). Supabase projesi **Frankfurt (eu-central-1)** bölgesinde açılır. Kod, ileride Türkiye'de bir sunucuya taşınabilecek şekilde yazılır: standart Postgres, Supabase'e özgü kilitlenme minimum düzeyde. |
| Domain | Ücretsiz Vercel alt adresi (ör. `tayfa-yoklama.vercel.app`). |
| Giriş | **Sadece Google ile giriş.** Yalnızca yönetimin davet listesine eklediği e-postalar girebilir. Listede olmayan biri giriş yaparsa "Erişiminiz yok, yöneticinizle iletişime geçin" ekranını görür. |
| Roller | Sadece iki rol: `admin` (yönetici: her şeyi okur ve yazar, raporlar, ayarlar) ve `leader` (lider: yalnızca kendi ekibini okur ve yazar). Koordinatör ve izleyici rolü **yok**. Ayrıntılar §4'te. |
| Lider yetkisi | Lider kendi ekibinde **tam yetkilidir**: öğrenci ekler, düzenler, durumunu değiştirir (çıkarıldı dahil). Her değişiklik denetim kaydına yazılır. |
| Etkinlik (buluşma) oluşturma | **Lider açar.** Tarih seçer, bir veya birden çok etkinlik türü işaretler, yoklamayı alır. Yönetimin o hafta için planladığı etkinlik varsa form onunla önceden dolu gelir. |
| Çoklu etkinlik | Bir buluşmada **tek yoklama** alınır, buluşmaya **birden çok etkinlik türü** etiketlenebilir. |
| Yoklama değerleri | `Geldi`, `Gelmedi`, `Mazeret`. Mazeret seçilince isteğe bağlı açıklama alanı açılır. |
| Öğrenci durumu | `Devam Ediyor`, `Devamsızlık Sınırında`, `Çıkarıldı`. Durumu **her zaman insan** (lider veya admin) değiştirir. |
| Otomatik uyarı | **Yok.** Net bir devamsızlık kuralı olmadığı için sistem durumu kendiliğinden değiştirmez, eşik ayarı da yoktur. Ekranlarda her öğrencinin mazeretsiz devamsızlık sayısı gösterilir, karar insana kalır. |
| İnternet | Uygulama **sadece internetle** çalışır. Çevrimdışı kuyruk yok. Kayıt başarısız olursa satırda açık bir hata ve "Tekrar dene" gösterilir, işaretleme kaybolmaz ama kaydedilmiş gibi de görünmez. |
| Hassas alanlar | TC ve telefon **açık** gösterilir (maskeleme yok). Lider yine sadece kendi ekibini görür (RLS). Tek tıkla kopyalama butonları olur. |
| Dönem | Sistem **yalnızca 2026–2027** dönemini tutar. Çoklu dönem altyapısı kurulmaz. |
| Sınıf seviyesi | Her ekibin bir `grade` değeri (10 / 11) vardır. Raporlar bu alana göre filtrelenir. |
| Cinsiyet | Ekipler cinsiyete göre ayrılır. Ekibin `gender` alanı vardır (K / E). |
| Bilinç Atölyesi sütunu | Kaldırılır, aktarılmaz. |
| Excel'den geçiş | Sistem **mevcut verilerle dolu açılır**: Sheets'teki tüm ekipler, öğrenciler ve yoklamalar canlıya çıkmadan önce Claude tarafından sunucu tarafında bir kez yüklenir. Uygulamada içe aktarma ekranı / sihirbazı **yoktur**, kimse öğrencisini sıfırdan girmez. Canlıya geçiş günü Sheets'in son hali yüklenir; o günden sonra liderler sadece uygulamayı kullanır, öğrenci ekleme/çıkarma/düzenleme uygulamadan yapılır, Sheets arşiv olarak kalır. Şablon sayfası yalnızca örnektir, aktarılmaz. (Excel **dışa aktarma** ayrı bir özelliktir ve her zaman vardır: filtrele, sütun seç, indir; bkz. §6.8.) |
| Eşleştirme | Sistem **önerir**, karar **yönetimin** elindedir. Sistem hiçbir ekibe kendiliğinden etkinlik atamaz. Yönetim önerileri tek tıkla forma alabilir ama kaydetmek her zaman elle yapılan bir onaydır. Önerinin amacı **adalettir**: her ekip her rotasyon etkinliğini eşit sayıda yapmalı (havuza hiç gitmeyen havuza; herkes 3 kez yapmışken 2'de kalan o etkinliğe). "Kim neyi kaç kez yaptı" **görsel matrisi** zorunludur. |
| Haftalık döngü | Genel kalıp **Liderlik → Rotasyon → Rotasyon** (§6.9). Liderlik / Şenlik / Kamp gibi haftalar **ortak** (tüm ekipler aynı), rotasyon haftalarında ekipler kontenjanlı etkinliklere dağıtılır. Döngü varsayılandır, yönetim her haftanın tipini değiştirebilir. Her ekibin buluşma günü genelde sabittir. |
| Geçen yıl verisi | **Kullanılmaz.** Eşleştirme sıfırdan, sadece 2026–2027 verisiyle başlar. Geçen yılın dosyası sadece iş kurallarını anlamak için analiz edildi (§6.9). |
| Ön teyit | **Yok.** "Gelecek / Haber Verecek / Ulaşamadım" gibi etkinlik öncesi durumlar eklenmez. Yoklama sadece Geldi / Gelmedi / Mazeret. |
| Bildirimler | Şimdilik **yok** (e-posta da push da yok). Panelde görsel uyarılar var (ör. "bu hafta yoklama girilmedi"). |
| Arayüz düzeni | **Excel benzeri tek tablo** (kullanıcı kararı, 29 Ekim 2026). Liderin tek ekranı kendi ekibinin tablosudur: satırlar öğrenciler, sütunlar buluşmalar, hücreye dokununca Geldi → Gelmedi → Mazeret → boş döner ve anında kaydolur. Yönetimde altta Excel'deki gibi sekmeler (Özet + her ekip). Ayrı yoklama sayfası, öğrenci listesi sayfası, yan menü ve alt menü **yoktur**. Kurulum işleri (lider e-postası, gün, cinsiyet) Özet tablosunda satırın içinde yapılır. Onaylanan taslak: https://claude.ai/artifact/8fHjrULP7ftmiQnPtrMCWt |
| Cihaz | **Telefon öncelikli.** Yoklama ekranı tek elle kullanılabilir. Yönetim raporları masaüstünde de rahat okunur. PWA olarak ana ekrana eklenebilir. |
| Tasarım | **Tayfa kurumsal kimliği**: turkuaz `#4BBACD` + çapa sarısı `#FBC52F`, logo `public/brand/tayfa-logo-square.png`. Kontrast kuralları ve token'lar §8'de. |
| Takvim | **1–2 hafta içinde MVP** canlıya çıkar (yoklama + öğrenci + içe aktarma + temel yönetim görünümü). Raporlar, sorgu ve eşleştirme sonraki fazlarda gelir. |

---

## 3. Teknoloji Yığını

- **Next.js 15** (App Router, Server Components, Server Actions) + **TypeScript (strict)**
- **Tailwind CSS** + **shadcn/ui** (Radix tabanlı). Bileşenler §8'deki tasarım diline göre sadeleştirilir.
- **Supabase**: Postgres, Auth (Google provider), Row Level Security. `@supabase/ssr` ile oturum.
- **Veri erişimi**: uygulama veritabanına `postgres` paketiyle doğrudan bağlanır (`DATABASE_URL`, Supabase transaction pooler). Her istek `lib/db.ts › asUser` ile kullanıcının kimliği ve `authenticated` rolüyle bir transaction içinde çalışır, böylece RLS her sorguda devrededir. Supabase'den sadece Google girişi kullanılır; Türkiye'ye taşınırken yalnızca kimlik doğrulama katmanı değişir.
- **Yerel geliştirme**: `tests/db/reset.sh` düz Postgres'te Supabase taklidiyle şemayı kurar, `pnpm seed:fake` sahte veri yükler, `DEV_AUTH=1` (sadece development) e-postayla giriş sağlar.
- **SQL migration dosyaları** (`supabase/migrations/*.sql`), ORM yok. RLS, trigger ve fonksiyonlar zaten SQL; tek şema kaynağı olsun. TypeScript tipleri `supabase gen types` ile üretilir. Şema panelden elle değiştirilmez.
- **Zod**: tüm form ve server action girdilerinin doğrulaması.
- **TanStack Table**: öğrenci listesi, matris görünümü, sorgu önizlemesi.
- **Recharts**: grafikler.
- **SheetJS (`xlsx`)**: Excel okuma (içe aktarma, tarayıcıda) ve yazma (dışa aktarma).
- **date-fns** + `tr` locale. Tüm tarihler `Europe/Istanbul` saat dilimine göre gösterilir.
- **Vitest** (birim testleri: parser, normalizasyon, öneri algoritması) + **Playwright** (kritik akışlar: giriş sonrası yoklama alma).
- Paket yöneticisi: **pnpm**.

Yeni bağımlılık eklemeden önce mevcut yığınla çözülüp çözülemeyeceğini düşün.

---

## 4. Roller ve Yetkiler

| Yetenek | leader | admin |
|---|---|---|
| Kendi ekibini görme | ✔ | ✔ (her ekip) |
| Yoklama alma / düzenleme | ✔ (kendi ekibi) | ✔ (her ekip) |
| Öğrenci ekleme / düzenleme / durum değiştirme | ✔ (kendi ekibi) | ✔ (her ekip) |
| Kendi ekibinin Excel'ini indirme | ✔ | ✔ |
| Tüm ekipleri ve raporları görme | — | ✔ |
| Sorgu oluşturucu + Excel indirme | — | ✔ |
| Eşleştirme paneli ve plan kaydetme | — | ✔ |
| Öğrenciyi ekipler arasında taşıma | — | ✔ |
| Kullanıcı davet etme, rol ve ekip atama | — | ✔ |
| Etkinlik türleri, okul listesi ayarları | — | ✔ |
| Denetim kaydını görme | — | ✔ |

- Bir liderin tek ekibi olur. Bir ekibin tek lideri olur. Lider değişirse admin `teams.leader_id` alanını günceller.
- **Yetki kontrolü veritabanında, RLS ile yapılır.** UI'daki gizleme sadece kolaylık içindir, güvenlik ona dayanmaz. Her tabloda RLS açık olur. Server action'lar kullanıcının oturumuyla çalışır; `service_role` anahtarı sadece içe aktarma ve seed script'lerinde, sunucu tarafında kullanılır.
- İlk admin, `INITIAL_ADMIN_EMAILS` ortam değişkeninden gelir (virgülle birden çok e-posta yazılabilir; varsayılan öneri `affanbugraozaytas@gmail.com`). Seed script bu e-postaları `admin` olarak davet listesine ekler. Sonraki adminler panelden eklenir.

---

## 5. Veri Modeli

Tablo ve sütun adları İngilizce, UI metinleri Türkçe. Tüm tablolarda `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at` bulunur.

```
profiles            -- auth.users ile 1:1
  id (= auth.uid), email, full_name, role (admin|leader), is_active

invitations         -- davet listesi; Google girişinde e-posta eşleşirse profile oluşturulur
  email (unique, lower), role, team_id null, invited_by, accepted_at

schools
  name (unique), short_name          -- ör. "Hüsnü M. Özyeğin Anadolu Lisesi"

teams
  name                -- varsayılan: lider adı + sınıf, ör. "Bedirhan Renez Öztürk · 10"
  leader_id -> profiles null
  grade smallint (10|11)
  gender char(1) (K|E)
  meeting_day (saturday|sunday|null)
  is_active

students
  team_id -> teams
  full_name
  phone            -- normalize: 10 hane, 5XXXXXXXXX
  parent_phone
  school_id -> schools null, school_raw text null   -- eşleşmeyen okul adı burada kalır
  class_label      -- "10/D", "11" vb. serbest metin
  tc_no char(11) null, tc_valid bool
  birth_date date null
  school_number text null
  status (active|at_risk|removed)
  status_reason text null, status_changed_at, status_changed_by
  joined_at date
  source (excel_main|excel_new_registration|app)
  notes text

activity_types
  name (unique), color (token adı), sort_order, is_active, in_rotation bool  -- rotasyona girenler eşleştirmede sayılır

sessions            -- bir ekibin bir buluşması = bir yoklama
  team_id, date (date), status (held|postponed|cancelled), note, created_by
  program_event_id -> program_events null   -- tüm ekiplerin katıldığı büyük etkinliğe bağlıysa
  unique (team_id, date)                    -- aynı gün ikinci buluşma gerekirse UI uyarır; gerekiyorsa kısıt kaldırılabilir

session_activity_types (session_id, activity_type_id)   -- çoklu etiket

attendance
  session_id, student_id, status (present|absent|excused), excuse_note, updated_by, updated_at
  pk (session_id, student_id)

program_events      -- şenlik, büyük gezi gibi tüm program çapında etkinlikler
  name, date, activity_type_id

program_weeks       -- program takvimi: her hafta sonunun tipi
  week_start date unique (cumartesi), type (common|rotation|break),
  common_activity_type_id null      -- type=common ise herkesin yapacağı tür (Liderlik, Şenlik, Kamp…)
  label text null                   -- type=break için "Dönem Arası", "Bayram", "Ramazan Kampı" gibi
  note

plan_entries        -- eşleştirme planı (yönetimin onayladığı)
  week_start date (o haftanın cumartesisi), team_id, activity_type_id, planned_date date null,
  note, created_by, unique (week_start, team_id, activity_type_id)

activity_capacity   -- o hafta sonu bir etkinliğe en fazla kaç ekip gidebilir
  week_start, activity_type_id, max_teams
  -- haftaya özel kayıt yoksa activity_types.default_capacity kullanılır (activity_types'a bu sütun eklenir)

settings            -- tek satır
  program_start date default '2026-09-01', program_end date default '2027-06-30'

saved_queries       -- sorgu oluşturucuda kaydedilmiş filtre ve sütun seçimleri
  owner_id, name, definition jsonb

audit_log
  actor_id, action (insert|update|delete|export|import), entity, entity_id, diff jsonb, at
```

**Kurallar:**
- `attendance` satırları, buluşma oluşturulurken o tarihte `status != removed` olan tüm ekip öğrencileri için **boş** oluşturulmaz. Sadece işaretlenenler yazılır. İşaretsiz öğrenci "girilmedi" sayılır ve raporda ayrıca gösterilir.
- Çıkarılan öğrenci listeden silinmez (`status = removed`). Geçmiş yoklamaları korunur. Varsayılan listelerde gizlenir, filtreyle görünür.
- Öğrenci silme (hard delete) sadece admin yapabilir, onay ister ve denetim kaydına yazılır.
- `audit_log` trigger'larla doldurulur (students, attendance, sessions, teams, plan_entries). Excel dışa aktarımları da `export` olarak loglanır.
- **Devam oranı** = `present / (present + absent + excused)`, sadece `status = held` olan buluşmalar üzerinden. Mazeret ayrıca gösterilir. Raporlarda iki oran da bulunur: "katılım" (geldi / toplam) ve "mazeretsiz devamsızlık".

---

## 6. Ekranlar ve Akışlar

Tüm arayüz **Türkçe**. Tarih biçimi: `11 Ekim 2026 Paz`. Sıralamalar `localeCompare(…, 'tr')` ile yapılır (İ/ı, Ş, Ğ doğru sıralanmalı).

### 6.1 Giriş
- Tek ekran: logo, "Google ile giriş yap" butonu, kısa açıklama. Başka bir şey yok.
- Giriş sonrası role göre yönlendirme: `leader` → `/ekibim`, diğer roller → `/yonetim`.

### 6.2 Lider — Ekip tablosu (`/ekibim`)
Liderin tek ekranı; Excel'deki sayfasının karşılığı. Bileşen: `components/team-sheet.tsx`, veri: `lib/data/sheet.ts`.
- Üstte ekip adı, gün, öğrenci sayısı ve varsa yönetimin bu haftaki planı ("Bu hafta: Bowling").
- Araç çubuğu: **Yeni buluşma** (pencere: tarih, etkinlik türü çipleri, durum Yapıldı/Ertelendi/İptal, not; tarih varsayılanı ekibin son buluşma günü, plan varsa türler seçili gelir), **Son buluşma: hepsi geldi** (sadece işaretsizleri doldurur), arama, "Çıkarılanları göster", öğrenci ekle (hızlı: sadece ad; "Tüm bilgileriyle ekle" forma gider), Excel indir.
- Tablo: ad sütunu ve başlık satırı sabit, en yeni buluşma sağda ve açılışta oraya kaydırılır, son buluşma turkuaz zeminli ve üstünde sarı çizgi. Masaüstünde telefon (kopyala + `tel:`), veli, okul, sınıf, "Gelmediği" sütunları; telefonda bunlar gizlenir, adın altında "3 kez gelmedi" yazar. Altta her buluşmanın "geldi/toplam" satırı.
- Hücre: dokununca Geldi → Gelmedi → Mazeret → boş; iyimser güncelleme, kaydedilemezse kırmızı çerçeve ve üstte uyarı, tekrar dokununca aynı değer yeniden denenir. Mazeret hücresinin köşesindeki üçgen (Excel yorum işareti gibi) not penceresini açar; not varsa üçgen turuncu.
- Sütun başlığına dokunmak buluşmayı düzenler/siler (silme iki dokunuşla onaylanır, tarayıcı diyaloğu yok). Ertelenen/iptal sütunlar gri ve yoklamasızdır.
- Ada dokunmak öğrenci detay sayfasını açar (`/ogrenciler/[id]`: tüm alanlar, kopyala, durum değiştirme, geçmiş; "Tabloya dön").

### 6.3 Yönetim — Özet (`/yonetim`) ve ekip sekmeleri (`/yonetim/ekipler/[id]`)
- Üst bantta Özet · Kullanıcılar · Ayarlar; altta Excel'deki gibi yatay kayan sekmeler: Özet + her aktif ekip (`components/sheet-tabs.tsx`).
- Özet: KPI şeridi (aktif öğrenci, bu hafta katılım ± geçen hafta, yoklaması girilen ekip, sınırdaki öğrenci) ve ekipler tablosu (`components/teams-grid.tsx`): ekip · **lider e-postası** (yazıp çıkınca kaydedilir, altında "Lider girişi yaptı / Davet edildi") · gün · cinsiyet (açılır listeler, değişince kaydedilir) · öğrenci · son 4 hafta · sınırda · bu hafta (Girildi / Girilmedi / Bekleniyor).
- **İstatistik öncelikli** (kullanıcı kararı, 29 Ekim 2026): Özet bir panodur. Üstte kartlar (aktif öğrenci, bu hafta katılım + 12 haftalık eğilim, yoklaması girilen ekip, takip edilecek), haftalık katılım çizgisi (10. ve 11. sınıf), bu hafta sonu Geldi/Mazeret/Gelmedi dağılımı, etkinlik türüne göre katılım. Ekip listesinin sütunları istatistiktir (öğrenci, son 4 hafta çubuğu + program ortalaması çizgisi, eğilim, sınırda, son yoklama, bu hafta); tek seferlik ayarlar (lider e-postası, gün, cinsiyet) sütun değildir, ekip adının yanındaki küçük etiketten açılan pencerede düzenlenir.
- Ekip sekmesi: liderin gördüğü tablonun aynısı, yönetici de düzenler.
- Liderin tablosunun üstünde gizlenebilir istatistik şeridi (`components/team-stats.tsx`): son buluşma, son 4 hafta (önceki 4 haftaya göre), program ortalaması (ekip kaç puan önde/geride; `program_week_rates()` security definer fonksiyonundan, sadece toplamlar), takip edilecek; geniş ekranda buluşma başına katılım sütunları. Telefonda kartlar yana kayan tek satır.
- Grafikler bağımlılıksız SVG (`components/charts.tsx`), renkler `--chart-*` token'ları (dataviz doğrulayıcısından geçti).
- Lider e-postası `setTeamLeaderEmail` ile davet listesine yazılır; ekibin tek lider daveti kalır, kişi daha önce girdiyse hemen bağlanır.

### 6.7 Yönetim — Raporlar (`/yonetim/raporlar`)
- Üstte filtreler: **dönem** (Son hafta · Son 4 hafta · Son 3 ay · Tüm dönem · Özel aralık), sınıf (10/11), cinsiyet, gün, ekip.
- Bölümler:
  1. **Özet** (seçili döneme göre KPI'lar, önceki eşit dönemle kıyas).
  2. **Ekip karşılaştırma**: katılım oranına göre sıralı yatay bar. Program ortalaması çizgisiyle.
  3. **Trend**: haftalık katılım, mazeret ve mazeretsiz devamsızlık (yığılmış alan veya çizgi).
  4. **Öğrenci sayısı değişimi**: haftalık aktif öğrenci, yeni katılan, çıkarılan.
  5. **Etkinlik türleri**: türlere göre buluşma sayısı ve ortalama katılım (hangi etkinlik daha çok katılım getiriyor).
  6. **Lider karnesi**: yoklamayı zamanında girme oranı, ekip büyüklüğü değişimi, katılım.
- **Haftalık özet** görünümü: tek sayfalık, yazdırılabilir (print CSS), "PDF olarak kaydet" tarayıcı yazdırmasıyla yapılır.
- Her grafik ve tablonun "Excel indir" butonu var.
- Grafikler `dataviz` prensiplerine uyar: az renk, doğrudan etiket, gereksiz ızgara ve 3D yok.

### 6.8 Yönetim — Sorgu Oluşturucu (`/yonetim/sorgu`)
SQL bilmeyen biri için "filtrele, sütun seç, indir" akışı:
1. **Filtreler** (eklenebilir satırlar, VE mantığı): ekip, sınıf seviyesi, cinsiyet, okul, öğrencinin sınıfı, durum, katılım oranı aralığı, mazeretsiz devamsızlık ≥ N, belirli bir etkinlik türüne katılmış / katılmamış, belirli bir tarihteki buluşmaya gelmiş, doğum tarihi aralığı, TC eksik / geçersiz, telefon eksik.
2. **Sütunlar**: onay kutularıyla (ad soyad, TC, doğum tarihi, telefon, veli telefonu, okul, sınıf, okul no, ekip, lider, durum, katılım %, geldiği buluşma sayısı…). Sürükleyerek sıralanır.
3. **Önizleme** tablosu (ilk 100 satır ve toplam sayı).
4. **Excel indir** (.xlsx, Türkçe başlıklar, TC metin olarak yazılır, tarihler gerçek tarih hücresi olur).
5. "Sorguyu kaydet" ile tekrar kullanılabilir şablonlar. Örnek hazır şablonlar: "Geziye katılacaklar için TC + doğum tarihi listesi", "Devamsızlık sınırındakiler ve veli numaraları".

Filtreler sunucuda parametreli sorguya çevrilir. **Kullanıcıdan gelen metin asla SQL'e birleştirilmez.**

### 6.9 Yönetim — Eşleştirme (`/yonetim/etkinlikler`)

**Yapılan (29 Ekim 2026):** Üst bantta "Etkinlikler". Üstte matris (a), altta haftalık planlayıcı (c) aynı sayfada; öneri algoritması (d) `lib/matching/suggest.ts` + `tests/unit/suggest.test.ts`. **Kullanıcı kararları:** plan kaydedilince her ekibin tablosunda o tarihte etkinliği hazır bir buluşma sütunu açılır (`app/actions/plan.ts › savePlan`), lider sadece yoklamayı işaretler; sütun kaydedildiği anda "Planlandı" etiketiyle görünür, günü gelince işaretlenir. **Liderler esnektir:** plandan gelen sütunun etkinliğini ve tarihini değiştirebilir. Bu yüzden buluşmalar 90 güne kadar ileri tarihli olabilir; ileri tarihli sütun işaretlenmez, devamsızlık ve istatistiklere girmez. Öneri, seçilen haftadan önce planlanmış (ileri tarihli) sütunları da sayar; böylece birkaç hafta ileriye plan yapılırken aynı ekibe üst üste aynı etkinlik önerilmez (matris yine sadece gerçekleşenleri gösterir). Plandan çıkarılan ekibin, plandan açılmış ve henüz işaretlenmemiş sütunu silinir; yoklaması alınmış buluşmaya dokunulmaz. Henüz yok: matris Excel indirme, program takvimi (b), plan/gerçekleşen karşılaştırması (e).

Amaç: yönetimin haftalık "hangi ekip ne yapacak" kararını **kolaylaştırmak** ve ekipler arasında **adaleti** sağlamak. **Sistem sadece önerir, nihai eşleştirmeyi yönetim elle yapar.**

**Geçen yılın (2025–2026) analizinden çıkan iş kuralları** (34 sayfa, yaklaşık 900 buluşma incelendi; bu veri sisteme **aktarılmaz**):
- **Döngü:** Program **Liderlik → Rotasyon → Rotasyon** kalıbıyla ilerliyor. Örnek: 18 Eki Liderlik, 25 Eki ve 1 Kas rotasyon, 8 Kas Liderlik, 29 Kas ve 6 Ara rotasyon, 13 Ara Liderlik…
- **Ortak haftalar:** Liderlik haftalarında ekiplerin neredeyse tamamı Liderlik yapıyor. Program açılışı ve kapanışında **Şenlik** var (4 Eki, 16 May). Ara ara Kamp, Konferans ya da ortak Film/Belgesel haftası oluyor.
- **Rotasyon haftaları:** Ekipler kontenjanlı etkinliklere dağıtılıyor. Bir hafta sonunda tipik dağılım: Bowling 3–5, Paintball 3–4, Havuz 2–3, Fotoğraf 2–4, Workshop 2–6, Stüdyo/Reels 2–4, Sosyal Sorumluluk 1–6, Sunum 1–5, Kitap Tahlili 2–3, Film Tahlili 1–4 ekip. Bu sayılar `activity_types.default_capacity` için başlangıç değeridir.
- **Ara haftalar:** Dönem arası, Ramazan kampı, bayram gibi haftalarda buluşma yok.
- **Günler sabit:** Çoğu ekip yılın %80'inden fazlasında aynı günde (cumartesi ya da pazar) buluşmuş. Ara sıra "pazara alındı" gibi kaymalar oluyor. Bu yüzden ekip günü varsayılandır, ama buluşma her tarihe açılabilir.
- **Dengesizlik (çözülecek asıl sorun):** Yıl boyunca 15'ten fazla buluşma yapan 24 ekipten **11'i hiç Havuz'a gitmemiş, 13'ü hiç Kitap Tahlili yapmamış, 7'si hiç Fotoğraf yapmamış, 6'sı hiç Paintball'a gitmemiş.** Buna karşılık bazı ekipler Workshop'a 4, Bowling'e 3 kez gitmiş. Eşleştirme ekranı bunu görünür kılmalı ve öneriler bunu düzeltmeye çalışmalı.

**a) Etkinlik dağılım matrisi** (ana görünüm, en önemli parça)
- Satırlar ekipler (gün ve sınıfa göre gruplu), sütunlar **rotasyondaki** etkinlik türleri. Ayrıca Liderlik ve ortak etkinlik sayısı için soluk bir özet sütunu.
- Hücrede o ekibin o etkinliği **kaç kez** yaptığı. Üzerine gelince (mobilde dokununca) yapıldığı tarihler görünür.
- Renk **o sütunun ortalamasına göre**: hiç yapmadı = belirgin vurgu (en koyu), ortalamanın altında = orta, ortalamada = nötr, ortalamanın üstünde = soluk. Böylece "Havuz sütununda kim geride" tek bakışta görülür.
- Satır sonunda ekibin **denge skoru** (yaptığı rotasyon türlerinin ortalamaya göre sapması). Sütun altında her türün program ortalaması ve "hiç yapmayan ekip sayısı" yazar.
- Filtreler: sınıf, gün, cinsiyet. Matris Excel olarak indirilebilir.
- Kaynak: sadece gerçekleşen (`status = held`) `sessions` + `session_activity_types`. Planlanıp yapılmayanlar sayılmaz.

**b) Program takvimi**
- Dönemin tüm hafta sonları bir şeritte gösterilir. Her haftanın tipi var: **Ortak** (tür seçilir: Liderlik, Şenlik, Kamp…), **Rotasyon** veya **Ara** (etiketli: Dönem Arası, Bayram…).
- "Döngüyü uygula" butonu: seçilen başlangıç haftasından itibaren boş haftaları Liderlik → Rotasyon → Rotasyon kalıbıyla **taslak** olarak doldurur. Yönetim haftaları tek tek değiştirir ve kaydeder. Mevcut kayıtların üzerine yazılmaz.

**c) Haftalık planlayıcı**
- Hafta seçici (varsayılan: önümüzdeki hafta sonu). Haftanın tipi üstte görünür.
- **Ortak hafta:** tek tıkla tüm aktif ekiplere aynı tür yazılır (yine "Planı kaydet" onayıyla).
- **Rotasyon haftası:**
  - Üstte o haftanın kontenjanları (varsayılanlar `default_capacity`'den gelir, haftaya özel değiştirilebilir, ör. "Havuz bu hafta 0 — kapalı").
  - Her ekip için bir satır: ekip · gün · **öneri** (soluk çip + kısa gerekçe, ör. "Havuz'a hiç gitmedi", "Bowling: ekip 1 / ortalama 2,4") · **seçim** (açılır liste, boş başlar).
  - Sağda canlı kontenjan sayacı: "Bowling 3/4 · Havuz 2/3". Kontenjan aşılırsa uyarı verilir ama engellenmez (karar yönetimde).
  - "Önerileri forma aktar" butonu seçimleri önerilerle doldurur. Yönetim istediğini değiştirir ve **"Planı kaydet"** butonuna basar. Kaydedilmemiş plan hiçbir yerde görünmez.
- Kaydedilen plan liderin "Ekibim" ekranında "Bu hafta: …" olarak görünür ve yoklama formunda etkinlik türünü önceden seçer (lider değiştirebilir).

**d) Öneri algoritması** (`lib/matching/suggest.ts`, saf fonksiyon, birim testli)
- Girdi: aktif ekipler, rotasyondaki türler (`in_rotation = true`), her ekip × tür için **bu dönemki** yapılma sayısı ve son tarih, haftanın kontenjanları, o hafta zaten elle seçilmiş satırlar (bunlar sabit kabul edilir, kontenjandan düşülür).
- Her ekip × tür için ihtiyaç skoru, öncelik sırasıyla:
  1. **Hiç yapmadıysa** büyük bonus (`+100`).
  2. **Eksik**: `(türün ekipler arası en yüksek sayısı − ekibin sayısı) × 10`. Hedef herkesin eşitlenmesi.
  3. **Bekleme**: son yapılmasının üzerinden geçen hafta sayısı (en fazla 12).
  4. **Tekrar cezası**: son 2 rotasyon haftasında yapıldıysa `−50`.
  Ağırlıklar ayarlar sayfasından değiştirilebilir, varsayılanlar yukarıdaki gibidir.
- Atama: kontenjanlara uyan **açgözlü** atama. Önce en çok "hiç yapmadığı" tür olan ekipler ele alınır, sonra en yüksek skorlu (ekip, tür) çiftlerinden başlanır. Eşitlikte ekip adına göre sabit sıra izlenir (deterministik sonuç). Kontenjan biterse ekibe bir sonraki uygun tür önerilir.
- Çıktı: her ekip için 1 öneri ve 2 alternatif, her biri insan diliyle yazılmış gerekçeyle. Ayrıca özet satırı: "Bu plan uygulanırsa hiç Havuz'a gitmeyen ekip sayısı 11 → 8".
- Testler: (i) hiç yapmayan önceliği, (ii) kontenjan aşılmaması, (iii) elle seçilenlerin korunması, (iv) aynı girdiye aynı çıktı.

**e) Plan ve gerçekleşen karşılaştırması**: geçmiş haftalarda plan ile liderin girdiği etkinlik türü farklıysa matriste ve planlayıcıda işaretlenir.

### 6.10 Yönetim — Kullanıcılar (`/yonetim/kullanicilar`)
- Davet ekle: e-posta + rol + (lider için) ekip.
- Liste: kişi, rol, ekip, son giriş, aktif/pasif. Pasife alınan kullanıcının oturumu bir sonraki istekte düşer.

### 6.11 Yönetim — Ayarlar (`/yonetim/ayarlar`)
- Etkinlik türleri: ekle, yeniden adlandır, renk seç, sırala, rotasyona dahil et veya çıkar, varsayılan kontenjan, pasifleştir (silme yok).
  Seed: **rotasyonda** Bowling (4), Paintball (4), Havuz (3), Fotoğraf (4), Workshop (5), Stüdyo/Reels (4), Sosyal Sorumluluk (5), Sunum (5), Kitap Tahlili (3), Film Tahlili (4). **Rotasyon dışı**: Liderlik, Şenlik, Serbest Gezi, Kamp, Konferans, Belgesel, Drama. (Parantez içi = varsayılan kontenjan.) "Ertelendi" bir tür değildir (§6.3).
- Okul listesi (birleştirme dahil: "Hüsnü M. Özyeğin" ile "Hüsnü M.özyiğin" aynı okul).
- Ekipler: ad, lider, sınıf, cinsiyet, buluşma günü.
- Eşleştirme ağırlıkları (§6.9-d).

### 6.13 Yönetim — Kayıtlar (`/yonetim/kayitlar`)
Denetim günlüğü: kim, ne zaman, neyi, nasıl değiştirdi. Filtrelenebilir.

---

## 7. Klasör Yapısı (öneri)

```
app/
  (auth)/giris/page.tsx
  (lider)/ekibim/ … yoklama/ … ogrenciler/ …
  (yonetim)/yonetim/ … ekipler/ raporlar/ sorgu/ eslestirme/ kullanicilar/ ayarlar/ kayitlar/
  api/…                     -- sadece gerekirse; tercih server actions
components/ui/              -- shadcn bileşenleri
components/…                -- uygulama bileşenleri (AttendanceRow, StatusBadge, KpiTile …)
lib/
  supabase/ (server.ts, client.ts, middleware.ts)
  import/ (parse-workbook.ts, normalize.ts, tc.ts, dates.ts)   -- saf, test edilebilir
  matching/suggest.ts
  reports/queries.ts
  export/xlsx.ts
supabase/migrations/*.sql
supabase/seed.sql           -- SADECE sahte veri
scripts/seed-fake.ts        -- Türkçe sahte isimlerle 26 ekip × 15-25 öğrenci × 8 hafta yoklama
tests/ (unit, e2e)
```

---

## 8. Tasarım Dili

**İlke: kurumsal, sakin, işlevsel. "Yapay zeka yapmış" izi olmayacak.**

Yasaklar: gradyan arka planlar, parlayan veya bulanık efektler, emoji, "✨" ya da yıldız ikonları, her kartta renkli ikon kutusu, aşırı yuvarlak köşeler, büyük boş "hero" alanları, "Hoş geldin 👋" tarzı metinler, pastel gökkuşağı paletleri, gereksiz animasyon.

**Marka (logodan ölçüldü):** Tayfa logosu turkuaz zemin üzerine beyaz, yuvarlak hatlı geometrik bir "tayfa" yazısı ve sarı bir çapadan oluşuyor. Dosya: `public/brand/tayfa-logo-square.png` (622×622, turkuaz zeminli kare).
- **Turkuaz `#4BBACD`**: markanın ana rengi.
- **Çapa sarısı `#FBC52F`**: vurgu rengi.

**Kontrast kuralı (önemli):** Logodaki turkuaz beyaz zeminde metin veya buton rengi olarak **kullanılamaz** (kontrast 2,3:1, AA için en az 4,5 gerekir). Sarı da beyaz üzerinde okunmaz (1,6:1). Bu yüzden:
- Etkileşim rengi (butonlar, bağlantılar, odak halkası, seçili sekme) turkuazın koyu tonudur: **`--brand-strong #17788A`**. Beyaz metinle kontrast 5,1:1.
- Logodaki turkuaz (`--brand`) **geniş yüzeylerde** kullanılır: giriş ekranı zemini, üst bant / kenar çubuğu başlığı, PWA açılış ekranı. Bu yüzeylerde metin beyaz ve büyük (≥ 18px kalın) ya da koyu (`--text`) olur.
- Sarı (`--accent`) **sadece küçük vurgularda** kullanılır: aktif menü göstergesi (ince çizgi), "Bu hafta" rozeti (sarı zemin + koyu metin), grafikte seçili / öne çıkan seri. Sarı zeminde metin her zaman `--text` olur.

**Logo kullanımı:**
- Giriş ekranı: turkuaz tam ekran zemin, ortada logo, altında beyaz kart içinde "Google ile giriş yap".
- Uygulama üst çubuğu / kenar çubuğu: turkuaz zemin üzerinde küçük logo, ya da beyaz zemin üzerinde turkuaz kare logo ikonu (32px).
- Favicon ve PWA ikonları kare logodan üretilir (192, 512, maskable). Zemin zaten turkuaz olduğu için ikon olarak doğrudan uygundur.
- Logoyu yeniden çizme, gerdirme, renklerini değiştirme. Şeffaf zeminli SVG gerekirse kullanıcıdan istenir; o gelene kadar PNG kullanılır.

Yapılacaklar:
- Beyaz / çok açık gri zemin, ince 1px çizgiler, 8px köşe yarıçapı (logonun yuvarlak karakterine uyumlu, ama "balon" kadar yuvarlak değil).
- Tipografi: arayüzde **Inter** (Türkçe karakter desteği tam; `@fontsource-variable` paketiyle uygulamanın içinden sunulur, Google'a istek gitmez), rakamlar `tabular-nums`. Sayfa başlıkları ve KPI rakamları için logonun geometrik yuvarlak karakterine yakın **Nunito Sans** ya da **Poppins** (600) kullanılabilir. İkisinden biri seçilir, en fazla iki font ailesi olur.
- Yoğun ama ferah tablolar (masaüstü). Mobilde kart listesi.
- Renk yalnızca anlam taşır: durum renkleri ve marka vurgusu. Sayfanın geneli beyaz ve gri kalır. Turkuaz yüzeyler sadece giriş ekranı ve başlık bandında kullanılır, her kart turkuaz olmaz.
- İkonlar: **lucide**, tek renk, 16–20px, sadece gerekli yerlerde.
- Koyu mod: desteklenir (token tabanlı), ama varsayılan açık temadır.
- Erişilebilirlik: kontrast WCAG AA. Durum asla sadece renkle anlatılmaz, her zaman metin veya ikon da bulunur. Klavye ile kullanılabilir.

**Token'lar** (`app/globals.css` içinde CSS değişkenleri):

```
/* Marka */
--brand:          #4BBACD   /* logo turkuazı — sadece geniş yüzeyler */
--brand-strong:   #17788A   /* butonlar, bağlantılar, odak — beyaz metinle 5.1:1 */
--brand-deep:     #0F5A68   /* hover / basılı durum */
--brand-tint:     #E8F6F9   /* seçili satır, hafif vurgu zemini */
--brand-fg:       #FFFFFF
--accent:         #FBC52F   /* çapa sarısı — sadece küçük vurgular, üzerinde koyu metin */
--accent-tint:    #FEF6DC

/* Nötr */
--bg:             #FFFFFF
--surface:        #F6F8F9   /* hafif turkuaza kaçan gri */
--border:         #E1E7EA
--text:           #111827
--text-muted:     #5F6B73

/* Durum */
--present:        #1E7B4F   (zemin #E7F4EC)   /* Geldi */
--absent:         #B42318   (zemin #FDECEA)   /* Gelmedi */
--excused:        #B54708   (zemin #FEF3E2)   /* Mazeret — sarı vurgudan ayırt edilebilecek kadar turuncu */
--at-risk:        #B54708
--removed:        #6B7280
```

Koyu mod için `--brand-strong` yerine `--brand` (#4BBACD) kullanılır (koyu zeminde kontrast yeterli), yüzeyler `#0F1416` / `#172024` olur.

Grafiklerde ana seri `--brand-strong`, karşılaştırma serisi gri, vurgulanan tek seri `--accent` olur. 10. ve 11. sınıf serileri için `--brand-strong` ve `--brand-deep` yerine ayırt edilebilir iki ton seçilir (dataviz paleti doğrulamasıyla).

Etkinlik türlerinin renkleri Excel'deki çiplerin tonlarını yumuşatarak taşır (Liderlik açık mavi, Fotoğraf lila, Şenlik koyu kırmızı, Paintball koyu yeşil, Bowling koyu mavi…). Ayarlardan değiştirilebilir, ama her zaman sınırlı ve onaylı bir paletten seçilir.

---

## 9. Mevcut Verinin Yüklenmesi (tek seferlik, sunucu tarafında)

**Gerçek Excel dosyası ve öğrencilerin kişisel verileri asla repoya girmez.** `.gitignore` içinde `*.xlsx`, `*.xls`, `*.csv` bulunur. Yükleme Claude'un çalışma ortamında, repo dışındaki bir dosyadan yapılır; dosya ve çıktıları commit edilmez, loglara kişisel veri yazılmaz.

### 9.1 Kaynak yapısı (`Tayfa Liderlik Programı 2026-2027 Yoklaması.xlsx`)
- 28 sayfa. `Notlar ` (kullanım talimatı) ve `Şablon` atlanır. Kalan **26 sayfanın her biri bir ekip**.
- Sayfa adı: `"<LİDER AD SOYAD> <10|11>"` → lider adı + sınıf seviyesi. (Bir sayfada yazım hatası var: "RÜMSEYSANUR".)
- Satır 5–7 (`D` sütunu): Okul / Lider / Koordinatör Öğretmen. Çoğu boş. Okul varsa öneri olarak kullanılır, koordinatör bilgisi aktarılmaz.
- **Ana liste**: satır 9–33, sütunlar:
  `A` sıra no · `B` Adı Soyadı · `C` Devam Durumu · `D` Telefon · `E` Okul · `F` Sınıfı · `G` TC Kimlik No · `H` Doğum Tarihi · `I` Veli Numarası · `J` Okul numarası · `K` Bilinç Atölyesi (**atla**).
- **Yoklama sütunları**: `L`'den sağa doğru. Satır 7 = etkinlik türü, satır 8 = tarih, satır 9–33 = `Geldi | Gelmedi | Mazeret`. Satır 5'te "YOKLAMA", ilerideki bir sütunda "Notlar" başlığı vardır. İçeriği sadece `" "` olan sütunlar boş sayılır.
- **Hücre notları (comment)** = mazeret açıklaması (toplam 32 adet, ör. "Düğünü varmış", "işte çalışıyor"). İlgili `attendance.excuse_note` alanına aktarılır. Sadece boşluk veya satır sonu içerenler atlanır.
- **"Yeni Kayıt" bölümü**: satır 40 başlık, satır 41 sütun adları, satır 42+ veriler. Sütunlar `C` sıra · `D` Adı Soyadı · `E` İletişim · `F` TC · `G` Doğum Tarihi · `H` Okul · `I` Sınıf · `J` Okul No. Ana listeyle birleştirilmelidir. 3 sayfada (Ceylin Irmak Üzüm, Ravzanur Kartal, Cihat Eren) ana liste tamamen boş, öğrenciler sadece burada; bu ekiplerin Sheets'te gerçek yoklaması yok.

**Gerçek dosyanın analizi (23 Ekim 2026, sadece sayımlar):**
- Ana listede 427, Yeni Kayıt'ta 447 satır var. Yeni Kayıt yalnızca "sonradan katılanlar" değil, büyük ölçüde **aynı öğrencilerin ikinci kaydı**: yaklaşık 270'i ad soyadla ana listeyle eşleşiyor. Eşleşmeyen yaklaşık 170 satır kalıyor, yani birleşik liste ~600 kişi çıkıyor (beklenen ~430). Bu yüzden eşleştirme bulanık olmalı (TC, sonra normalize ad, sonra benzer ad) ve **şüpheli eşleşmeler admin onayına** sunulmalı.
- Yoklama sütunları: Şenlik (ortak, 1 hafta), Liderlik (10–11 Ekim haftası), birkaç Fotoğraf ve 1 Stüdyo/Reels. Toplam 538 yoklama hücresi (323 Geldi, 145 Gelmedi, 70 Mazeret), 31 mazeret notu.
- Liderlik ve Fotoğraf sütunlarının çoğunda **tarih boş** (25+ sütun). Yükleme kuralı: tarih, sütun sırasına göre haftaya ve ekibin buluşma gününe göre atanır (kullanıcı onaylı).
- Birçok sütunda adı boş olan 9. satırda tek bir `Geldi/Gelmedi` değeri var (şablon artığı). Öğrenci adı olmayan satırdaki yoklama yok sayılır ve raporlanır. 33. satırın altında da 3 başıboş yoklama hücresi var, aynı kural.
- Ana listede 337 TC'nin 17'si geçersiz. Telefonlarda `5XXXXXXXXX.0` (sayı), görünmez Unicode yön işaretleri, bölünmez boşluk, `Yok`, `5XX…(Annesinin telefonu)` gibi değerler var: rakam dışı temizlenir, parantez içi açıklama `notes` alanına gider.
- Sınıf sütunu çoğunlukla boş, dolu olanlar `10`, `11`, `10/F`, `10-F`, `11-C Adalet`, `11/MTA` gibi. Olduğu gibi `class_label`'a aktarılır (sayı ise tam sayıya çevrilir).
- Okul adlarında ~55 farklı yazım var, ~20 gerçek okula iniyor (ör. "İTMTAL" ile "İbrahim Turhan Mesleki ve Teknik Anadolu Lisesi", "İTO 15 Temmuz…" varyasyonları). Kısaltmalar otomatik eşleşmez, admin eşleme ekranında birleştirir.

### 9.2 Bilinen veri sorunları ve kurallar
| Sorun | Kural |
|---|---|
| TC hücresi tarih biçimli (Excel serisi olarak okunuyor, ör. `99332499514`) | Ham sayısal değeri al (`cell.v`), 11 haneli tam sayıya çevir. Biçimlendirilmiş metni kullanma. |
| TC 11 hane değil veya checksum tutmuyor (ör. "58432606") | Aktar, `tc_valid = false`, raporda listele. |
| Telefon biçimleri: `5515069537`, `0530 381 05 44`, `90 535 479 27 51`, `(501) 127 21 76` | Rakam dışını sil, baştaki `90` / `0` kaldırılır → 10 hane `5XXXXXXXXX`. 10 hane çıkmazsa ham hali korunur ve işaretlenir. |
| Tarih yılı karışık: Şablon'daki `5 Ekim 2025` kopyalanmış; diğerleri 2026 | Program yılına göre düzelt: ay ≥ 9 → 2026, ay ≤ 8 → 2027. **Ama** şablondan kalan tarih yıl düzeltilince hafta sonu dışına düşebilir (`5 Ekim 2025 Paz` → `5 Ekim 2026 Pzt`). Düzeltilmiş tarih cumartesi/pazar değilse sütun "tarih şüpheli" olarak işaretlenir ve admin onaylar. Şenlik gibi ortak etkinliklerde tek tarih tüm ekiplere birlikte atanabilir. |
| Tarih metin olarak yazılmış: `"13 EKİM"`, `"10 Ekim"` | Türkçe ay adlarıyla ayrıştır (büyük/küçük harf ve İ/ı duyarsız), yılı yukarıdaki kuralla ekle. Hafta içine düşen tarih (13 Ekim 2026 Salı) "tarih şüpheli" olur. |
| Tarih boş ama yoklama verisi var | Sütunun haftası sayfadaki sırasından çıkarılır (Şenlik haftası = 3 Ekim cumartesi, sonraki her sütun +1 hafta), gün ekibin Excel'deki tarihli buluşmalarından (yoksa cumartesi). Buluşmanın notuna "tarih tahmin edildi" yazılır. Kural `scripts/excel-overrides.ts`'te durur; tarihi atanamayan sütun varsa yükleme durur. |
| Etkinlik türü yazımları: `"Fotoğraf "` (sonda boşluk), `"Fotoğraf, Liderlik"` | Virgülle böl, kırp, Türkçe büyük/küçük harf duyarsız eşleştir. Birden çok tür → çoklu etiket. Eşleşmeyen tür → yükleme durur, kullanıcıya sorulur. |
| Etkinlik türü var, tarih yok, hiç yoklama yok (şablondan kalma boş sütunlar) | Atla. |
| Sütundaki tek işaret 9. satırda (şablonda ilk satır dolu geliyor; 27 sütun) | Şablon artığı, atla. |
| Yeni Kayıt'ta ad D'ye, soyad E'ye yazılmış, geri kalan her şey bir sütun sağa kaymış (~30 satır) | E metinse ve G 11 haneliyse satırı bir sütun kaydırarak oku, ad = D + E. |
| Doğum tarihi metin: `"23.8.2011"`, `"10/08/2011"`, `"14.1.2011"` | `d.M.yyyy` ve `dd/MM/yyyy` dene. Başarısızsa boş bırak ve işaretle. |
| Durum: `Devam Ediyor`, `devam`, boş, `" "` | → `active`. `Devamsızlık Sınırında` → `at_risk`. `Çıkarıldı` → `removed`. |
| Okul adı varyasyonları: "Hüsnü M. Özyeğin Anadolu Lisesi", "Hüsnü M.özyiğin", "Hüsnü M. Özyeğ" | Normalize et (küçük harf, tr, noktalama ve boşluk temizliği). Varyasyonlar `scripts/excel-overrides.ts` içindeki eşleme tablosuyla tek `school`'a bağlanır (okul adları kişisel veri değildir); sonra Ayarlar'dan birleştirilebilir. |
| Sınıf sütununda okul adı veya karışık değer (ör. sınıf "10/A" okul sütununda) | Ham değeri `class_label` / `school_raw` alanlarına olduğu gibi aktar, raporla. Tahminle düzeltilmez. |
| Ad soyad büyük/küçük harf karışık ("MUHAMMET ALİ İDEKÇİ", "haktan alim") | Türkçe kurallarla "Başlık Düzeni"ne çevir (`İ/ı` doğru). Orijinali audit diff'inde kalır. |
| Ana liste ve Yeni Kayıt'ta aynı kişi | Önce geçerli TC ile, yoksa normalize ad soyad ile eşleştir. Eşleşenler birleştirilir (boş alanlar diğerinden doldurulur, çakışan değerler raporlanır). Eşleşmeyen Yeni Kayıt satırları `source = excel_new_registration` ile yeni öğrenci olur. |

### 9.3 Yükleme akışı (sihirbaz yok)
1. `scripts/load-excel.ts <dosya.xlsx>`: dosya repoya girmeden, Claude'un çalışma ortamında okunur. Parser (`lib/import`) çalışır, ardından `lib/import/plan.ts` veritabanına yazılacak satırları üretir.
2. Belirsiz noktalar kodda **açık kurallarla** çözülür (ekip günü/cinsiyeti, eksik tarihler, okul eşlemesi; bkz. `scripts/excel-overrides.ts`, gerçek kişi verisi içermez). Kurallar kullanıcıyla netleştirilir.
3. `--dry-run` önce çalışır ve sadece sayımları/uyarıları yazar (ad, TC, telefon yazdırılmaz).
4. Gerçek yükleme `service_role` ile tek transaction'da yapılır; `audit_log`'a `import` kaydı düşer.
5. **İdempotent**: tekrar çalıştırılırsa kopya oluşmaz (ekip = sayfa adı, öğrenci = TC veya ad+ekip, session = ekip+tarih). Canlıya geçiş günü son dosyayla bir kez daha çalıştırılabilir; o günden sonra çalıştırılmaz.

Parser (`lib/import/*`) saf TypeScript olmalı ve **sahte bir test workbook'uyla** (testte programatik üretilir, aynı düzen ve aynı kirli veri örnekleriyle) birim testine tabi tutulmalıdır.

---

## 10. Kişisel Verilerin Korunması

- Veri: reşit olmayan öğrencilerin TC, doğum tarihi, telefon ve veli telefonu. KVKK kapsamında dikkatle işlenir.
- Supabase Frankfurt bölgesinde (AB). Yurt dışı aktarım ve aydınlatma metni gibi hukuki yükümlülükler **belediyenin** sorumluluğundadır. Uygulama altbilgisinde "Kişisel Verilerin Korunması" sayfası için yer bırakılır (metin belediyeden gelecek).
- Gerçek veri **asla** repoya, loglara, hata izleme servisine, test fixture'larına veya ekran görüntüsü olarak issue'lara girmez. Geliştirme ve önizleme ortamları sadece sahte veriyle çalışır.
- RLS her tabloda açık. RLS politikaları için ayrı testler var: lider A, ekip B'nin öğrencisini **okuyamaz ve yazamaz**.
- `service_role` anahtarı istemci paketine asla girmez (`NEXT_PUBLIC_` ile başlamaz).
- Excel dışa aktarımları `audit_log` içine yazılır (kim, hangi sorguyla, kaç satır).
- `robots.txt`: tüm siteyi indekslemeye kapat. Giriş sayfası dışında her şey oturum ister.

---

## 11. Yol Haritası

### Faz 0 — Kurulum (kullanıcıyla birlikte, ilk oturum)
Kullanıcı teknik değil; adımları ekran ekran, Türkçe tarif et:
1. **Supabase**: supabase.com'da hesap → yeni proje, bölge **Frankfurt** → Project URL, `anon` ve `service_role` anahtarlarını al.
2. **Google OAuth**: Google Cloud Console'da proje → OAuth onay ekranı (External, uygulama adı "Tayfa Yoklama") → OAuth Client ID (Web) → yetkili yönlendirme URI'si olarak Supabase'in verdiği callback adresi → Client ID ve Secret'ı Supabase › Authentication › Providers › Google'a gir.
3. **Vercel**: GitHub reposunu (`affanbugra/tayfa`) bağla → ortam değişkenlerini gir → deploy. Ardından Supabase › Auth › URL Configuration kısmına Vercel adresini ekle.
4. `.env.example` dosyası tüm değişkenleri açıklamalarıyla listeler.

**Faz 0 durumu (28 Ekim 2026):** Supabase hesabı ve `tayfa-yoklama` projesi (Frankfurt, Free) açıldı. Bulut oturumundan Supabase'e erişilemediği için kurulum kullanıcının bilgisayarındaki yerel Claude Code oturumunda devam eder. Kullanıcı yorgun ve teknik değil: **her adımda en az tıklama**, mümkün olan her şeyi CLI ile Claude yapar.
Yerel oturumda sıradaki adımlar:
1. `pnpm install`, ardından `npx supabase login` (tarayıcıda tek onay) ve `npx supabase link --project-ref <ref>` (proje ref'i `npx supabase projects list` ile bulunur; DB şifresi sorulursa kullanıcının not ettiği şifre).
2. Şema: `npx supabase db push` (`supabase/migrations/*.sql`).
3. Veri: kullanıcıdan Excel dosyasının yolunu iste (repoya kopyalama). `DATABASE_URL` = Supabase › Connect › Session pooler bağlantısı. Önce `pnpm load-excel <dosya>` (kuru çalıştırma), sonra `INITIAL_ADMIN_EMAILS=affanbugraozaytas@gmail.com pnpm load-excel <dosya> --apply`.
4. Google girişi: Google Cloud'da OAuth istemcisi (kullanıcıyla ekran ekran), Client ID/Secret Supabase › Authentication › Providers › Google'a.
5. Vercel: repoyu içe aktar, ortam değişkenleri (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` transaction pooler 6543), deploy; Supabase › Auth › URL Configuration'a Vercel adresi.
6. Kurulum bitince kullanıcıya oluşturduğu Supabase erişim anahtarlarını silmesini hatırlat.

**Faz 0 ilerleme (29 Ekim 2026, yerel oturum):**
- Supabase CLI kullanılmadı: şema `pnpm migrate` ile doğrudan `DATABASE_URL` üzerinden kuruldu (proje ref `pmfaszdtamfidfkvpfxy`, session pooler `aws-1-eu-central-1`). DB şifresi sıfırlandı, yalnızca `.env.local`'da.
- Excel yüklendi: 26 ekip, 567 öğrenci, 32 buluşma, 496 yoklama; ilk admin daveti var. Kaynak dosya 23 Ekim tarihli, canlıya geçişte son haliyle tekrar çalıştırılacak.
- Google OAuth: Google Cloud projesi "Tayfa Yoklama" (`pristine-valve-513016-u5`), istemci "Tayfa Yoklama Web", Supabase'te Google sağlayıcısı açık.
- Vercel: proje `tayfa-yoklama` (Hobby), üretim dalı `master`, üç ortam değişkeni girildi.
- Supabase › Auth › URL Configuration: site `https://tayfa-yoklama.vercel.app`, yönlendirmeler canlı + önizleme (`tayfa-yoklama-*-affanbugras-projects.vercel.app`) + `localhost:3000`. Canlı Google girişi kullanıcıyla denendi.
- Dikkat: Vercel'de ortam değişkenleri "Production and Preview" olarak girildi, yani önizlemeler de **canlı veritabanına** bağlı (§10 ile çelişir). Ayrı bir sahte veri projesi açılana kadar önizlemelerde gerçek veriyle dikkatli olunur.
- Kalan: `xlsx` paketinin CDN sürümüne geçişi (§13 #9), yanlışlıkla okunan `service_role` anahtarının Supabase'te yenilenmesi.

### Faz 1 — MVP (hedef: 1–2 hafta, liderler kullanmaya başlar)
- [x] Next.js iskeleti, tasarım token'ları, layout (lider mobil alt menü, yönetim kenar çubuğu)
- [x] Şema + RLS + trigger'lar + seed (sadece sahte veri) + ilk admin daveti
- [x] Google girişi + davet listesi kontrolü + role göre yönlendirme
- [x] Lider: Ekibim, Yoklama Al (anında kayıt, hata olursa tekrar dene), Yoklamalar listesi, Öğrenciler (liste, detay, ekle, düzenle, durum), tablo/matris görünümü
- [x] Ekip Excel'i indirme
- [x] Yönetim: Genel Bakış (KPI, yoklama girilmeyenler, ekipler tablosu), ekip detayı (temel), Kullanıcılar, Ayarlar (etkinlik türleri, ekipler, okullar)
- [ ] **Mevcut verinin yüklenmesi** (`scripts/load-excel.ts` hazır ve yerelde gerçek dosyayla doğrulandı; canlı veritabanına yükleme Faz 0 bitince)
- [x] PWA manifest + ikon
- [x] Playwright: "lider girer → yoklama alır → yönetim görür" akışı; RLS testleri

### Faz 2 — Raporlar ve Sorgu
- [ ] Raporlar sayfası (tüm bölümler, dönem filtreleri, yazdırılabilir haftalık özet)
- [ ] Sorgu oluşturucu + kayıtlı sorgular + hazır şablonlar
- [ ] Denetim kaydı ekranı

### Faz 3 — Eşleştirme
- [x] Etkinlik dağılım matrisi (ortalamaya göre renk, "hiç" sütunu, ortalama ve "hiç yapmayan" satırları) — Excel indir eksik
- [x] Haftalık planlayıcı, kapasite (haftaya özel), "herkese aynı etkinlik"
- [x] Öneri algoritması + gerekçeler + birim testleri
- [x] Planın lider tablosuna yansıması (hazır sütun) — plan ve gerçekleşen karşılaştırması eksik
- [ ] Program takvimi (ortak / rotasyon / ara haftalar, "döngüyü uygula")

### Faz 4 — Cila
- [ ] Boş durum ekranları, yükleme iskeletleri, şeffaf SVG logo gelirse PNG yerine geçir
- [ ] Performans (430 öğrenci küçük ölçek, ama rapor sorguları için index ve materialized view gerekirse)
- [ ] Kullanım kılavuzu: lider için tek sayfalık "nasıl yoklama alırım" (ekran görüntülü, sahte veriyle)

---

## 12. Çalışma Kuralları (Claude için)

- Her faz sonunda: `pnpm lint`, `pnpm typecheck`, `pnpm test` ve kritik e2e testleri yeşil olmalı. Sonra Vercel önizleme adresini kullanıcıya ver.
- Küçük, anlamlı commit'ler at. Commit mesajları Türkçe veya İngilizce olabilir ama tutarlı olmalı.
- UI metinlerini bileşenlerin içine dağıtma, `lib/i18n/tr.ts` içinde topla (tek dil, ama tek yerde).
- Tüm sorgular sunucuda çalışır. İstemciye sadece ekranın ihtiyaç duyduğu veri gider.
- Bu dosyadaki bir kararı değiştirmen gerekirse önce kullanıcıya sor, onay gelince bu dosyayı güncelle.
- Kullanıcıdan gerçek veri, ekran görüntüsü veya Excel istenirse bunları **sadece analiz için** kullan. Repoya koyma, koda gömme.
- Bilmediğin bir iş kuralına rastlarsan tahmin etme: §13'e ekle ve kullanıcıya sor.

---

## 13. Bekleyen Konular

| # | Konu | Durum |
|---|---|---|
| 1 | Geçen yılın (2025–2026) etkinlik dosyası. | ✅ Analiz edildi, bulgular §6.9'da. Veri sisteme aktarılmaz. |
| 2 | Tayfa logosu ve renkleri. | ✅ Alındı, §8'e işlendi. İleride şeffaf zeminli SVG gelirse PNG'nin yerine konur (engelleyici değil). |
| 3 | İlk admin e-postası. | ✅ `INITIAL_ADMIN_EMAILS` ortam değişkeniyle çözüldü (§4). Faz 0'da kullanıcıya sorulup girilir. |
| 4 | KVKK aydınlatma metni. | Belediyeden gelecek. O zamana kadar boş sayfa. |
| 5 | Supabase mı, başka bir altyapı mı? | ✅ Supabase, ücretsiz plan. |
| 6 | Yedekleme. | ✅ Şimdilik yapılmıyor (kullanıcı kararı). Ücretsiz planda otomatik yedek yok. |
| 7 | Şenlik'in gerçek tarihi. | ✅ Kullanıcı: 5 Ekim 2026. Tüm Şenlik sütunları bu tarihe yazılır (uygulamadan düzeltilebilir). |
| 8 | Birleşik öğrenci listesi ~600 çıkıyor, beklenen ~430. Yeni Kayıt'ta olup ana listede olmayan ~170 kişi gerçekten ekipte mi? | ✅ Hepsi aktarılır (kullanıcı: "en ideali yap, yanlışsa uygulamadan düzeltilir"). Sonuç: 567 öğrenci. Başka ekibin ana listesinde de olan Yeni Kayıt satırları ana listedeki ekipte kalır. |
| 10 | Ekiplerin cinsiyeti ve buluşma günü. | ✅ Bilinmiyor; boş başlar. Yönetici Özet tablosunda satırın içinden girer (29 Ekim 2026: liderdeki ayrı form kaldırıldı). Eşleştirmede yönetim tarihi elle seçer (`plan_entries.planned_date`), lider o tarihi görür. |
| 9 | SheetJS sürümü. | npm'deki `xlsx@0.18.5` eski ve bilinen açıkları var (dosya ayrıştırmada). Geliştirme ortamı `cdn.sheetjs.com`'a erişemediği için geçici olarak bu sürüm kullanılıyor; Vercel'e çıkmadan önce `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` ile değiştirilir. |
