-- 0008 — fold the daily song into today_summary() (perf, #131).
-- Today previously made TWO round-trips on load: today_summary (routine + completions
-- + journal) and a separate daily_song select for the song-of-the-day bar. Add the
-- song for p_to to the one RPC so Today loads in a single request. The client passes
-- it to <SongOfDay> as initialSong so the bar doesn't fetch on mount.
--
-- CREATE OR REPLACE only (no data change). security invoker → RLS still applies
-- (#108); the song row is server-read here just like the journal row above it.
-- Older clients ignore the extra 'song' key; newer clients that don't see it (old
-- RPC) fall back to fetching the song themselves, so deploy order doesn't matter.

create or replace function public.today_summary(p_from date, p_to date)
returns json
language sql
stable
security invoker
as $$
  select json_build_object(
    'routine_items', coalesce(
      (select json_agg(r order by r.sort_order) from routine_item r), '[]'::json
    ),
    'completions', coalesce(
      (
        select json_agg(json_build_object('routine_item_id', c.routine_item_id, 'day', c.day))
        from completion c
        where c.day between p_from and p_to
      ),
      '[]'::json
    ),
    'journal', (select row_to_json(j) from journal j where j.day = p_to),
    'song', (select row_to_json(s) from daily_song s where s.day = p_to)
  );
$$;

revoke execute on function public.today_summary(date, date) from public, anon;
grant execute on function public.today_summary(date, date) to authenticated;
