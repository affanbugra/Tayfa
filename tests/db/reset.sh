#!/usr/bin/env bash
# Yerel test veritabanını sıfırdan kurar: Supabase taklidi + tüm migration'lar.
# Kullanım: DATABASE_URL=postgres://postgres@127.0.0.1:54329/tayfa_test tests/db/reset.sh
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL gerekli}"
ADMIN_URL="${DATABASE_URL%/*}/postgres"
DB_NAME="${DATABASE_URL##*/}"
psql "$ADMIN_URL" -q -v ON_ERROR_STOP=1 -c "drop database if exists \"$DB_NAME\" with (force)" -c "create database \"$DB_NAME\""
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$(dirname "$0")/supabase-stub.sql"
for f in "$(dirname "$0")"/../../supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$f"
done
echo "veritabanı hazır: $DB_NAME"
