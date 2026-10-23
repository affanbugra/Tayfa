import { execSync } from "node:child_process";

export default function globalSetup() {
  const db = process.env.E2E_DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/tayfa_e2e";
  const env = { ...process.env, DATABASE_URL: db, INITIAL_ADMIN_EMAILS: "yonetici@ornek.test" };
  execSync("tests/db/reset.sh", { env, stdio: "inherit" });
  execSync("pnpm -s tsx scripts/seed-fake.ts", { env, stdio: "inherit" });
  execSync(
    `psql "${db}" -qc "insert into public.invitations (email, role, team_id) select 'lider@ornek.test', 'leader', id from public.teams where name = 'Deniz Ak · 10'"`,
    { env, stdio: "inherit" },
  );
}
