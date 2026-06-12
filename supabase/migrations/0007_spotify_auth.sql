-- 0007 — Spotify OAuth tokens for "song of the day → from your listening" (#126).
-- Single row (single-user, #070). Holds the user's access/refresh tokens so the
-- server can read recently-played / currently-playing. RLS like 0003: authenticated
-- only (anon inert, #108). Tokens are server-read only (never sent to the client UI).

create table if not exists public.spotify_auth (
  id            int primary key default 1 check (id = 1),
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  updated_at    timestamptz not null default now()
);

alter table public.spotify_auth enable row level security;
drop policy if exists "authenticated all" on public.spotify_auth;
create policy "authenticated all" on public.spotify_auth
  for all to authenticated using (true) with check (true);
