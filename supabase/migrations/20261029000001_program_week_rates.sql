-- Program geneli haftalık katılım oranı. Liderler kendi ekiplerini programla kıyaslayabilsin diye
-- security definer: başka ekiplerin satırlarını açmaz, yalnızca hafta başına toplam sayı döner.
-- Hafta = o haftanın cumartesisi (lib/dates.ts › weekStartOf ile aynı kural).
create or replace function public.program_week_rates()
returns table (week_start date, present int, total int)
language sql stable security definer set search_path = public as $$
  select (se.date - ((extract(isodow from se.date)::int + 1) % 7))::date as week_start,
         count(*) filter (where a.status = 'present')::int as present,
         count(a.*)::int as total
  from sessions se
  join teams t on t.id = se.team_id and t.is_active
  join attendance a on a.session_id = se.id
  where se.status = 'held'
  group by 1
  order by 1
$$;
revoke execute on function public.program_week_rates() from public;
grant execute on function public.program_week_rates() to authenticated;
