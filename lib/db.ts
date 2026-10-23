// Veritabanı erişimi. Her istek, giriş yapan kullanıcının kimliğiyle ve `authenticated` rolüyle
// bir transaction içinde çalışır; böylece RLS her sorguda devrededir (CLAUDE.md §4).
// Standart Postgres bağlantısıdır: Supabase'e kilitlenmez.
import "server-only";
import postgres from "postgres";

declare global {
  var __tayfaSql: postgres.Sql | undefined;
}

function client(): postgres.Sql {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL tanımlı değil");
  globalThis.__tayfaSql ??= postgres(url, {
    max: 5,
    prepare: false, // Supabase transaction pooler (6543) ile uyumlu
    idle_timeout: 20,
    onnotice: () => {},
    types: { date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x } },
  });
  return globalThis.__tayfaSql;
}

export type Tx = postgres.TransactionSql;

export async function asUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await client().begin(async (tx) => {
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true),
                    set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
    await tx.unsafe("set local role authenticated");
    return fn(tx);
  })) as T;
}

/** Yetkisiz (RLS'siz) bağlantı. Sadece yerel geliştirme girişi ve script'ler kullanır. */
export function rawSql(): postgres.Sql {
  return client();
}
