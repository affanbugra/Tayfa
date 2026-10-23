// Sahte veri: geliştirme, önizleme ve e2e testleri için (CLAUDE.md §7, §10). Gerçek kişi içermez.
//   DATABASE_URL=... pnpm seed:fake
import postgres from "postgres";

const FIRST = ["Ahmet", "Ayşe", "Mehmet", "Zeynep", "Mustafa", "Elif", "Yusuf", "Meryem", "Emir", "Hira", "Ömer", "Büşra", "İbrahim", "Şeyma", "Kerem", "Gizem", "Çağrı", "Irmak", "Ali", "Nisa", "Hüseyin", "Esma", "Burak", "Rabia", "Talha"];
const LAST = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Öztürk", "Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt", "Özkan", "Şimşek", "Polat", "Erdoğan", "Güneş", "Bulut", "Tekin", "Akın"];
const LEADERS = ["Deniz Ak", "Sena Bal", "Kaan Can", "Ece Dal", "Mert Er", "Selin Fidan", "Arda Gök", "Melis Han", "Onur Işık", "Pelin Jale", "Berk Kurt", "Duru Lale", "Ege Mavi", "Naz Nur", "Alp Oğuz", "Su Pınar", "Can Rüzgar", "İpek Saygı", "Efe Tan", "Ada Uslu", "Emre Vural", "Lina Yaz", "Tuna Zor", "Defne Ay", "Kuzey Bey", "Asya Ceylan"];
const SCHOOLS = ["Deneme Anadolu Lisesi", "Örnek Mesleki ve Teknik Anadolu Lisesi", "Sahte Kız Anadolu İmam Hatip Lisesi", "Test Fen Lisesi"];

let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];

function fakeTc(): string {
  const d = [1 + Math.floor(rand() * 9), ...Array.from({ length: 8 }, () => Math.floor(rand() * 10))];
  const d10 = (((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10 + 10) % 10;
  const d11 = (d.reduce((a, b) => a + b, 0) + d10) % 10;
  return [...d, d10, d11].join("");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL gerekli");
  if (/supabase\.(co|com)/.test(url) && process.env.ALLOW_FAKE_ON_SUPABASE !== "1") throw new Error("Canlı veritabanına sahte veri yazılmaz");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql.begin(async (tx) => {
    await tx`select set_config('app.skip_audit', 'on', true)`;
    const types = await tx<{ id: string; name: string; in_rotation: boolean }[]>`select id, name, in_rotation from public.activity_types`;
    const liderlik = types.find((t) => t.name === "Liderlik")!;
    const rotation = types.filter((t) => t.in_rotation);
    const schoolIds: string[] = [];
    for (const name of SCHOOLS) {
      const [s] = await tx<{ id: string }[]>`insert into public.schools (name) values (${name}) on conflict (name) do update set name = excluded.name returning id`;
      schoolIds.push(s.id);
    }
    for (let i = 0; i < LEADERS.length; i++) {
      const grade = i < 12 ? 10 : 11;
      const gender = i % 2 === 0 ? "E" : "K";
      const day = gender === "E" ? "saturday" : "sunday";
      const [team] = await tx<{ id: string }[]>`
        insert into public.teams (name, leader_name, grade, gender, meeting_day, sheet_name)
        values (${`${LEADERS[i]} · ${grade}`}, ${LEADERS[i]}, ${grade}, ${gender}, ${day}, ${`FAKE ${i}`})
        on conflict (sheet_name) do update set name = excluded.name returning id`;
      const size = 15 + Math.floor(rand() * 11);
      const students: string[] = [];
      for (let j = 0; j < size; j++) {
        const [st] = await tx<{ id: string }[]>`
          insert into public.students (team_id, full_name, phone, phone_valid, parent_phone, parent_phone_valid, school_id, class_label, tc_no, tc_valid, birth_date, source, import_key)
          values (${team.id}, ${`${pick(FIRST)} ${pick(LAST)}`}, ${`555${String(Math.floor(rand() * 1e7)).padStart(7, "0")}`}, true,
            ${`555${String(Math.floor(rand() * 1e7)).padStart(7, "0")}`}, true, ${pick(schoolIds)}, ${`${grade}/${pick(["A", "B", "C", "D"])}`},
            ${fakeTc()}, true, ${`${2026 - grade - 6}-0${1 + Math.floor(rand() * 9)}-1${Math.floor(rand() * 9)}`}, 'app', ${`FAKE ${i}|${j}`})
          on conflict (import_key) do update set full_name = excluded.full_name returning id`;
        students.push(st.id);
      }
      // 8 hafta: 2026-08-29'dan itibaren (Liderlik → Rotasyon → Rotasyon)
      for (let w = 0; w < 8; w++) {
        const sat = new Date(Date.UTC(2026, 7, 29 + w * 7 + (day === "sunday" ? 1 : 0)));
        const date = sat.toISOString().slice(0, 10);
        const type = w % 3 === 0 ? liderlik : pick(rotation);
        const [se] = await tx<{ id: string }[]>`
          insert into public.sessions (team_id, date) values (${team.id}, ${date})
          on conflict (team_id, date) do update set status = 'held' returning id`;
        await tx`insert into public.session_activity_types (session_id, activity_type_id) values (${se.id}, ${type.id}) on conflict do nothing`;
        for (const sid of students) {
          const r = rand();
          const status = r < 0.72 ? "present" : r < 0.9 ? "absent" : "excused";
          await tx`insert into public.attendance (session_id, student_id, status, excuse_note) values (${se.id}, ${sid}, ${status}, ${status === "excused" ? "Ailevi sebep" : null})
                   on conflict do nothing`;
        }
      }
    }
    for (const email of (process.env.INITIAL_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)) {
      await tx`insert into public.invitations (email, role) values (${email}, 'admin') on conflict (email) do nothing`;
    }
  });
  await sql.end();
  console.log("Sahte veri yüklendi: 26 ekip, 8 hafta.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
