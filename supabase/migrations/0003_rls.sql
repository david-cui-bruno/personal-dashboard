-- Row-Level Security (pre-deploy hardening). Single-user app (#070): any
-- authenticated session is David. Lock every public table to the `authenticated`
-- role; `anon` (no session) gets nothing. This makes the public anon key inert
-- without a valid login, so the auth gate (proxy) can't be bypassed by hitting
-- the Supabase REST API directly. storage.objects already has RLS from 0002.

alter table public.routine_item enable row level security;
alter table public.completion   enable row level security;
alter table public.journal      enable row level security;
alter table public.note         enable row level security;
alter table public.attachment   enable row level security;
alter table public.settings     enable row level security;

create policy "authenticated all" on public.routine_item for all to authenticated using (true) with check (true);
create policy "authenticated all" on public.completion   for all to authenticated using (true) with check (true);
create policy "authenticated all" on public.journal      for all to authenticated using (true) with check (true);
create policy "authenticated all" on public.note         for all to authenticated using (true) with check (true);
create policy "authenticated all" on public.attachment   for all to authenticated using (true) with check (true);
create policy "authenticated all" on public.settings     for all to authenticated using (true) with check (true);
