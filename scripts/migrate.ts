// supabase/migrations/*.sql dosyalarını sırayla, bir kez uygular (schema_migrations tablosuyla).
// Supabase CLI gerektirmez; herhangi bir Postgres'te çalışır.
//   DATABASE_URL=... pnpm migrate
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL_NON_POOLING;
  if (!url) throw new Error("DATABASE_URL gerekli");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    await sql`alter table public.schema_migrations enable row level security`;
    const done = new Set((await sql<{ name: string }[]>`select name from public.schema_migrations`).map((r) => r.name));
    const dir = join(process.cwd(), "supabase", "migrations");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      if (done.has(file)) continue;
      await sql.begin(async (tx) => {
        await tx.unsafe(readFileSync(join(dir, file), "utf8"));
        await tx`insert into public.schema_migrations (name) values (${file})`;
      });
      console.log(`uygulandı: ${file}`);
    }
    console.log("Şema güncel.");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
