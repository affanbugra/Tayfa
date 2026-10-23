-- Tayfa Yoklama şeması (CLAUDE.md §5). Standart Postgres; Supabase'e özgü kısımlar yalnızca
-- auth.users / auth.uid() ve authenticated / service_role rolleridir.

create extension if not exists pgcrypto;

-- updated_at ---------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Tablolar -----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique check (email = lower(email)),
  full_name text,
  role text not null check (role in ('admin', 'leader')),
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader_name text,                       -- profil henüz yokken de görünen lider adı
  leader_id uuid unique references public.profiles (id) on delete set null,
  grade smallint not null check (grade in (10, 11)),
  gender char(1) check (gender in ('K', 'E')),
  meeting_day text check (meeting_day in ('saturday', 'sunday')),
  is_active boolean not null default true,
  sheet_name text unique,                 -- Excel yüklemesinin anahtarı
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  role text not null check (role in ('admin', 'leader')),
  team_id uuid references public.teams (id) on delete set null,
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role = 'admin' or team_id is not null)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id),
  full_name text not null check (length(trim(full_name)) > 0),
  phone text,
  phone_valid boolean not null default false,
  parent_phone text,
  parent_phone_valid boolean not null default false,
  school_id uuid references public.schools (id) on delete set null,
  school_raw text,
  class_label text,
  tc_no text check (tc_no ~ '^\d+$'),
  tc_valid boolean not null default false,
  birth_date date,
  school_number text,
  status text not null default 'active' check (status in ('active', 'at_risk', 'removed')),
  status_reason text,
  status_changed_at timestamptz,
  status_changed_by uuid references public.profiles (id) on delete set null,
  joined_at date,
  source text not null default 'app' check (source in ('excel_main', 'excel_new_registration', 'app')),
  notes text,
  import_key text unique,                 -- Excel yüklemesinin anahtarı (sayfa + TC/ad)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'removed' or status_reason is not null)
);
create index students_team_idx on public.students (team_id);
create index students_tc_idx on public.students (tc_no);

create table public.activity_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default 'slate',
  sort_order int not null default 0,
  is_active boolean not null default true,
  in_rotation boolean not null default false,
  default_capacity int check (default_capacity is null or default_capacity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  activity_type_id uuid references public.activity_types (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id),
  date date not null,
  status text not null default 'held' check (status in ('held', 'postponed', 'cancelled')),
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  program_event_id uuid references public.program_events (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, date)
);

create table public.session_activity_types (
  session_id uuid not null references public.sessions (id) on delete cascade,
  activity_type_id uuid not null references public.activity_types (id),
  primary key (session_id, activity_type_id)
);

create table public.attendance (
  session_id uuid not null references public.sessions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'excused')),
  excuse_note text,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
create index attendance_student_idx on public.attendance (student_id);

create table public.program_weeks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique check (extract(isodow from week_start) = 6),
  type text not null check (type in ('common', 'rotation', 'break')),
  common_activity_type_id uuid references public.activity_types (id),
  label text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Eşleştirme planı: yönetim elle atar ve tarihi seçer.
create table public.plan_entries (
  id uuid primary key default gen_random_uuid(),
  week_start date not null check (extract(isodow from week_start) = 6),
  team_id uuid not null references public.teams (id) on delete cascade,
  activity_type_id uuid not null references public.activity_types (id),
  planned_date date,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_start, team_id, activity_type_id)
);

create table public.activity_capacity (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  activity_type_id uuid not null references public.activity_types (id),
  max_teams int not null check (max_teams >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_start, activity_type_id)
);

create table public.settings (
  id boolean primary key default true check (id),
  program_start date not null default '2026-09-01',
  program_end date not null default '2027-06-30',
  matching_weights jsonb not null default '{"never": 100, "deficit": 10, "waitWeeksMax": 12, "repeatPenalty": -50}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.settings default values;

create table public.saved_queries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null check (action in ('insert', 'update', 'delete', 'export', 'import')),
  entity text not null,
  entity_id text,
  diff jsonb,
  at timestamptz not null default now()
);
create index audit_log_at_idx on public.audit_log (at desc);

do $$
declare t text;
begin
  foreach t in array array['profiles','schools','teams','invitations','students','activity_types','program_events',
    'sessions','attendance','program_weeks','plan_entries','activity_capacity','settings','saved_queries']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Yetki yardımcıları ---------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

create or replace function public.my_team_id() returns uuid
language sql stable security definer set search_path = public as $$
  select t.id from teams t join profiles p on p.id = t.leader_id
  where p.id = auth.uid() and p.role = 'leader' and p.is_active;
$$;

create or replace function public.can_access_team(team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or team = public.my_team_id();
$$;

-- Denetim kaydı ----------------------------------------------------------------
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  old_j jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_j jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  changed jsonb;
  row_id text;
begin
  if coalesce(current_setting('app.skip_audit', true), '') = 'on' then
    return coalesce(new, old);
  end if;
  row_id := coalesce(new_j ->> 'id', old_j ->> 'id',
    (coalesce(new_j, old_j) ->> 'session_id') || ':' || (coalesce(new_j, old_j) ->> 'student_id'));
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(key, jsonb_build_object('old', old_j -> key, 'new', value))
      into changed
      from jsonb_each(new_j)
      where key not in ('updated_at') and old_j -> key is distinct from value;
    if changed is null then return new; end if;
  else
    changed := coalesce(new_j, old_j);
  end if;
  insert into audit_log (actor_id, action, entity, entity_id, diff)
  values (auth.uid(), lower(tg_op), tg_table_name, row_id, changed);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['students','attendance','sessions','teams','plan_entries','invitations','profiles']
  loop
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- Öğrenci durumu değişince kim/ne zaman bilgisi
create or replace function public.track_student_status() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.status_changed_at := now();
    new.status_changed_by := coalesce(auth.uid(), new.status_changed_by);
  end if;
  return new;
end $$;
create trigger track_status before insert or update of status on public.students
  for each row execute function public.track_student_status();

-- Lider ekibinde yalnızca buluşma günü ve cinsiyeti değiştirebilir
create or replace function public.guard_team_update() returns trigger
language plpgsql as $$
begin
  -- Sunucu fonksiyonları (security definer) ve yükleme script'i bu kısıta takılmaz.
  if current_user <> 'authenticated' or public.is_admin() then return new; end if;
  if (new.name, new.leader_name, new.leader_id, new.grade, new.is_active, new.sheet_name)
     is distinct from (old.name, old.leader_name, old.leader_id, old.grade, old.is_active, old.sheet_name) then
    raise exception 'Bu alanları sadece yönetici değiştirebilir';
  end if;
  return new;
end $$;
create trigger guard_team_update before update on public.teams
  for each row execute function public.guard_team_update();

-- Davetten profile: Google ile ilk girişte e-posta davet listesinde varsa profil açılır.
create or replace function public.accept_invitation() returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  uemail text;
  inv invitations;
  prof profiles;
begin
  select lower(email) into uemail from auth.users where id = auth.uid();
  if uemail is null then return null; end if;
  select * into prof from profiles where id = auth.uid();
  if found then
    update profiles set last_seen_at = now() where id = auth.uid() returning * into prof;
    return prof;
  end if;
  select * into inv from invitations where email = uemail;
  if not found then return null; end if;
  insert into profiles (id, email, role) values (auth.uid(), uemail, inv.role) returning * into prof;
  update invitations set accepted_at = now() where id = inv.id;
  if inv.role = 'leader' and inv.team_id is not null then
    update teams set leader_id = auth.uid() where id = inv.team_id and leader_id is null;
  end if;
  return prof;
end $$;

-- Satır düzeyi güvenlik ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.teams enable row level security;
alter table public.invitations enable row level security;
alter table public.students enable row level security;
alter table public.activity_types enable row level security;
alter table public.program_events enable row level security;
alter table public.sessions enable row level security;
alter table public.session_activity_types enable row level security;
alter table public.attendance enable row level security;
alter table public.program_weeks enable row level security;
alter table public.plan_entries enable row level security;
alter table public.activity_capacity enable row level security;
alter table public.settings enable row level security;
alter table public.saved_queries enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_admin on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy invitations_admin on public.invitations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Referans tabloları: herkes okur, yönetici yazar
do $$
declare t text;
begin
  foreach t in array array['schools','activity_types','program_events','program_weeks','activity_capacity','settings']
  loop
    execute format('create policy %1$s_read on public.%1$I for select to authenticated using (true)', t);
    execute format('create policy %1$s_admin on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

create policy teams_read on public.teams for select to authenticated
  using (public.can_access_team(id));
create policy teams_update on public.teams for update to authenticated
  using (public.can_access_team(id)) with check (public.can_access_team(id));
create policy teams_admin on public.teams for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy students_rw on public.students for all to authenticated
  using (public.can_access_team(team_id)) with check (public.can_access_team(team_id));
-- Kalıcı silme sadece yöneticide (lider "Çıkarıldı" yapar)
create policy students_no_leader_delete on public.students as restrictive for delete to authenticated
  using (public.is_admin());

create policy sessions_rw on public.sessions for all to authenticated
  using (public.can_access_team(team_id)) with check (public.can_access_team(team_id));

create policy session_types_rw on public.session_activity_types for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and public.can_access_team(s.team_id)))
  with check (exists (select 1 from public.sessions s where s.id = session_id and public.can_access_team(s.team_id)));

create policy attendance_rw on public.attendance for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and public.can_access_team(s.team_id)))
  with check (
    exists (select 1 from public.sessions s where s.id = session_id and public.can_access_team(s.team_id))
    and exists (select 1 from public.students st join public.sessions s on s.team_id = st.team_id
                where st.id = student_id and s.id = session_id)
  );

create policy plan_read on public.plan_entries for select to authenticated
  using (public.can_access_team(team_id));
create policy plan_admin on public.plan_entries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy saved_queries_owner on public.saved_queries for all to authenticated
  using (owner_id = auth.uid() and public.is_admin()) with check (owner_id = auth.uid() and public.is_admin());

create policy audit_admin_read on public.audit_log for select to authenticated
  using (public.is_admin());

-- Yetkiler: anonim kullanıcı hiçbir tabloya erişemez
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
grant execute on function public.accept_invitation() to authenticated;
