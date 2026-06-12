-- 0006 — song of the day (#123). One logged song per day, shown atop the journal
-- entry + on the Notes stream. `url` is the pasted Spotify/Apple Music link; title/
-- artist/art_url are best-effort OpenGraph metadata (server-fetched, see /api/song).
-- RLS mirrors 0003: single-user (#070), locked to `authenticated`, anon inert (#108).

create table if not exists public.daily_song (
  day        date primary key,
  url        text not null,
  title      text,
  artist     text,
  art_url    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_song enable row level security;
drop policy if exists "authenticated all" on public.daily_song;
create policy "authenticated all" on public.daily_song
  for all to authenticated using (true) with check (true);
