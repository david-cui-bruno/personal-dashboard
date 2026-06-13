-- 0005 — today_summary(): one round-trip for the whole Today screen + the
-- consistency heatmap (#020/#022), replacing ~5 separate selects (latency, #122).
-- Returns the routine template, completions across the chart window, and today's
-- journal as one JSON blob; the client derives "active today", "done today", and
-- the per-day heatmap from it (no consistency math duplicated in SQL).
--
-- p_from/p_to are the caller's LOCAL day window (#011/#083). security invoker →
-- RLS applies (authenticated sees its rows; anon inert, #108).

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
    'journal', (select row_to_json(j) from journal j where j.day = p_to)
  );
$$;

revoke execute on function public.today_summary(date, date) from public, anon;
grant execute on function public.today_summary(date, date) to authenticated;
