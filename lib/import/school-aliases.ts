// Excel'deki okul adı yazımlarını tek okula bağlar. Okul adları kişisel veri değildir.
// Eşleme normalizeKey ile yapılır; burada olmayan bir yazım olduğu gibi ayrı okul olur ve
// Ayarlar'dan birleştirilebilir.
export const SCHOOL_ALIASES: Record<string, string[]> = {
  "Menderes Anadolu Lisesi": [],
  "İbrahim Turhan Mesleki ve Teknik Anadolu Lisesi": ["İTMTAL", "İbrahim Turhan MTAL"],
  "Atışalanı Anadolu Lisesi": ["Atısalanını lisesi", "Atışalanı AL"],
  "Amiral Vehbi Ziya Dümer Anadolu Lisesi": ["Amiral Vehbi Ziya Dümer AL"],
  "Aksoy Kız Anadolu İmam Hatip Lisesi": ["Aksoy Kız AİHL", "Aksok Kız AİHL"],
  "Şehit Türkmen Tekin Kız Anadolu İmam Hatip Lisesi": ["Şehit Türkmen"],
  "Turgut Reis Mesleki ve Teknik Anadolu Lisesi": [
    "Turgut Reis MTAL", "Turgut Reis Mesleki Teknik Anadolu Lisesi", "Turgut Reis Meslek", "Turgut Reis Mesleki Teknik Aanadou Lisesi",
  ],
  "Esenler Mesleki ve Teknik Anadolu Lisesi": ["Esenler meslek", "Esenler MTAL"],
  "Hüsnü M. Özyeğin Anadolu Lisesi": ["Hüsnü M.özyiğin anadolu lissesi", "Hüsnü M. Özyeğ", "Hüsnü M.özyiğin"],
  "Tuna Mesleki ve Teknik Anadolu Lisesi": ["ESENLER/ TUNA TİCARET MTAL", "TUNA MTAL", "Tuna Ticaret MTAL", "Tuna meslek"],
  "İTO 15 Temmuz Şehitleri Anadolu İmam Hatip Lisesi": [
    "İto 15 Temmuz Şehitleri AİHL", "İto 15 Temmuz Şehitler Anadolu İmamhatip Lisesi", "İto 15 Temmuz", "İTO",
  ],
  "Atatürk Anadolu Lisesi": [],
  "Akşemsettin Anadolu İmam Hatip Lisesi": [
    "Akşemsettin Anadolu ihl", "Akşemseddin anadolu imam hatip lisesi", "AKŞEMSETTİN İHL",
  ],
  "Mehmet Tevfik Göksu Anadolu İmam Hatip Lisesi": ["Mehmet tevfik göksu"],
  "Oruç Reis Anadolu İmam Hatip Lisesi": ["Oruç Reis İHL"],
  "İbn-i Sina Mesleki ve Teknik Anadolu Lisesi": ["İbn-i sina mesleki teknik Anadolu lisesi"],
  "Yunus Emre Mesleki ve Teknik Anadolu Lisesi": [],
  "Açık Öğretim Lisesi": ["Açıköğretim Lisesi", "Açık Öğretim"],
  "RTE Anadolu İmam Hatip Lisesi": ["Rte anadolu imam hatip"],
  "Güzide Özdilek Kız Anadolu İmam Hatip Lisesi": ["Güzide Özdilek"],
  "Ümmü Mihcen Kız Anadolu İmam Hatip Lisesi": ["Ümmihcen anadolu imam hatip lisesi", "Ümmü mihcen kız Anadolu İmam Hatip lisesi"],
  "M. Emin Saraç Anadolu İmam Hatip Lisesi": ["M.Emin Saraç AİHL"],
  "Özel İstanbul Organize Sanayi Bölgesi Mesleki ve Teknik Anadolu Lisesi": [
    "Özel İstanbul Organize Sanayi bölgesi mesleki ve teknik Anadolu lisesi",
  ],
};
