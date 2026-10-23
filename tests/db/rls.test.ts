// RLS testleri (CLAUDE.md §10). Gerçek bir Postgres ister: DATABASE_URL yoksa atlanır.
// Kurulum: tests/db/reset.sh
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.DATABASE_URL;
const sql = url ? postgres(url, { max: 1, onnotice: () => {} }) : null;

const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  leaderA: "00000000-0000-4000-8000-00000000000a",
  leaderB: "00000000-0000-4000-8000-00000000000b",
  stranger: "00000000-0000-4000-8000-0000000000ff",
  teamA: "10000000-0000-4000-8000-00000000000a",
  teamB: "10000000-0000-4000-8000-00000000000b",
  studentA: "20000000-0000-4000-8000-00000000000a",
  studentB: "20000000-0000-4000-8000-00000000000b",
  sessionB: "30000000-0000-4000-8000-00000000000b",
};

/** Verilen kullanıcı olarak tek transaction içinde çalıştırır ve geri alır. */
async function as<T>(userId: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  let result: T | undefined;
  let error: unknown;
  await sql!
    .begin(async (tx) => {
      await tx`select set_config('request.jwt.claim.sub', ${userId ?? ""}, true)`;
      await tx.unsafe(`set local role ${userId ? "authenticated" : "anon"}`);
      try {
        result = await fn(tx);
      } catch (e) {
        error = e;
      }
      throw new Rollback();
    })
    .catch((e) => {
      if (!(e instanceof Rollback)) throw e;
    });
  if (error) throw error;
  return result as T;
}
class Rollback extends Error {}

describe.skipIf(!sql)("RLS", () => {
  beforeAll(async () => {
    await sql!.begin(async (tx) => {
      await tx`select set_config('app.skip_audit', 'on', true)`;
      await tx`truncate public.attendance, public.sessions, public.students, public.invitations, public.teams, public.profiles, public.audit_log cascade`;
      await tx`delete from auth.users`;
      for (const [id, email] of [
        [ids.admin, "admin@ornek.test"], [ids.leaderA, "a@ornek.test"], [ids.leaderB, "b@ornek.test"], [ids.stranger, "x@ornek.test"],
      ]) await tx`insert into auth.users (id, email) values (${id}, ${email})`;
      await tx`insert into public.profiles (id, email, role) values
        (${ids.admin}, 'admin@ornek.test', 'admin'), (${ids.leaderA}, 'a@ornek.test', 'leader'), (${ids.leaderB}, 'b@ornek.test', 'leader')`;
      await tx`insert into public.teams (id, name, grade, leader_id) values
        (${ids.teamA}, 'Ekip A', 10, ${ids.leaderA}), (${ids.teamB}, 'Ekip B', 11, ${ids.leaderB})`;
      await tx`insert into public.students (id, team_id, full_name, tc_no) values
        (${ids.studentA}, ${ids.teamA}, 'Öğrenci A', '10000000146'), (${ids.studentB}, ${ids.teamB}, 'Öğrenci B', '10000000146')`;
      await tx`insert into public.sessions (id, team_id, date) values (${ids.sessionB}, ${ids.teamB}, '2026-10-10')`;
      await tx`insert into public.invitations (email, role, team_id) values ('yeni@ornek.test', 'leader', ${ids.teamA})`;
    });
  });
  afterAll(async () => {
    await sql?.end();
  });

  it("leader sees only own team and students", async () => {
    const r = await as(ids.leaderA, async (tx) => ({
      teams: await tx`select name from public.teams`,
      students: await tx`select full_name from public.students`,
    }));
    expect(r.teams.map((t) => t.name)).toEqual(["Ekip A"]);
    expect(r.students.map((s) => s.full_name)).toEqual(["Öğrenci A"]);
  });

  it("leader cannot update or move another team's student", async () => {
    const updated = await as(ids.leaderA, (tx) => tx`update public.students set full_name = 'x' where id = ${ids.studentB} returning id`);
    expect(updated).toHaveLength(0);
    await expect(
      as(ids.leaderA, (tx) => tx`update public.students set team_id = ${ids.teamB} where id = ${ids.studentA}`),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(ids.leaderA, (tx) => tx`insert into public.students (team_id, full_name) values (${ids.teamB}, 'Sızma')`),
    ).rejects.toThrow(/row-level security/);
  });

  it("leader cannot write attendance to another team's session or mix teams", async () => {
    await expect(
      as(ids.leaderA, (tx) => tx`insert into public.attendance (session_id, student_id, status) values (${ids.sessionB}, ${ids.studentA}, 'present')`),
    ).rejects.toThrow(/row-level security/);
    const sessionA = await as(ids.leaderA, async (tx) => {
      const [s] = await tx`insert into public.sessions (team_id, date) values (${ids.teamA}, '2026-10-17') returning id`;
      await tx`insert into public.attendance (session_id, student_id, status) values (${s.id}, ${ids.studentA}, 'present')`;
      return tx`select count(*)::int as n from public.attendance`;
    });
    expect(sessionA[0].n).toBe(1);
  });

  it("leader can change student status but cannot hard delete", async () => {
    const r = await as(ids.leaderA, async (tx) => {
      await tx`update public.students set status = 'removed', status_reason = 'Taşındı' where id = ${ids.studentA}`;
      const deleted = await tx`delete from public.students where id = ${ids.studentA} returning id`;
      const [s] = await tx`select status, status_changed_by from public.students where id = ${ids.studentA}`;
      return { deleted, s };
    });
    expect(r.deleted).toHaveLength(0);
    expect(r.s).toMatchObject({ status: "removed", status_changed_by: ids.leaderA });
  });

  it("leader may edit meeting day but not team leader or name", async () => {
    const day = await as(ids.leaderA, (tx) => tx`update public.teams set meeting_day = 'sunday' where id = ${ids.teamA} returning meeting_day`);
    expect(day[0].meeting_day).toBe("sunday");
    await expect(as(ids.leaderA, (tx) => tx`update public.teams set name = 'Yeni' where id = ${ids.teamA}`)).rejects.toThrow(/yönetici/);
  });

  it("admin sees everything; audit log records actor", async () => {
    const r = await as(ids.admin, async (tx) => {
      await tx`update public.students set notes = 'not' where id = ${ids.studentB}`;
      return {
        teams: await tx`select count(*)::int as n from public.teams`,
        audit: await tx`select actor_id, action, entity from public.audit_log where entity = 'students'`,
      };
    });
    expect(r.teams[0].n).toBe(2);
    expect(r.audit).toEqual([{ actor_id: ids.admin, action: "update", entity: "students" }]);
  });

  it("leader cannot read audit log or invitations", async () => {
    const r = await as(ids.leaderA, async (tx) => ({
      audit: await tx`select * from public.audit_log`,
      inv: await tx`select * from public.invitations`,
    }));
    expect(r.audit).toHaveLength(0);
    expect(r.inv).toHaveLength(0);
  });

  it("anonymous user reads nothing", async () => {
    await expect(as(null, (tx) => tx`select * from public.students`)).rejects.toThrow(/permission denied/);
  });

  it("uninvited user gets no profile; invited leader gets profile and team", async () => {
    const none = await as(ids.stranger, (tx) => tx`select public.accept_invitation() as p`);
    expect(none[0].p).toBeNull();
    const newId = "00000000-0000-4000-8000-0000000000aa";
    const r = await sql!.begin(async (tx) => {
      await tx`insert into auth.users (id, email) values (${newId}, 'Yeni@ornek.test')`;
      await tx`update public.teams set leader_id = null where id = ${ids.teamA}`;
      await tx`select set_config('request.jwt.claim.sub', ${newId}, true)`;
      await tx.unsafe("set local role authenticated");
      const [p] = await tx`select (public.accept_invitation()).role as role`;
      const teams = await tx`select name from public.teams`;
      await tx.unsafe("reset role");
      await tx`select set_config('request.jwt.claim.sub', '', true)`;
      await tx`delete from public.profiles where id = ${newId}`;
      await tx`delete from auth.users where id = ${newId}`;
      await tx`update public.teams set leader_id = ${ids.leaderA} where id = ${ids.teamA}`;
      await tx`update public.invitations set accepted_at = null`;
      return { role: p.role, teams: teams.map((t) => t.name) };
    });
    expect(r).toEqual({ role: "leader", teams: ["Ekip A"] });
  });
});
