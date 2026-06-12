-- 0004 — widget_summary(): one round-trip for the home-screen widget (#119).
-- Returns today's routine progress + the "focus" (weakest habit) so the native
-- WidgetKit extension doesn't reimplement the consistency math in Swift.
--
-- `p_day` is the caller's LOCAL day (#011/#083) — Postgres has no device timezone.
-- security invoker → RLS applies (authenticated sees its own rows, #108).

create or replace function public.widget_summary(p_day date)
returns table (done int, total int, focus_label text, focus_item_id uuid)
language sql
stable
security invoker
as $$
  with active as (
    -- items active on p_day (active-window rule, #016)
    select id, label, sort_order, created_on
    from routine_item
    where created_on <= p_day
      and (archived_on is null or archived_on > p_day)
  ),
  rates as (
    -- per item: completion rate over the last 30 local days (only the days it
    -- was active count toward the denominator)
    select
      a.id,
      a.label,
      a.sort_order,
      ((p_day - greatest(a.created_on, p_day - 29)) + 1) as days_active,
      (
        select count(*)
        from completion c
        where c.routine_item_id = a.id
          and c.day between (p_day - 29) and p_day
      ) as comps
    from active a
  ),
  focus as (
    -- weakest habit: lowest completion rate, ties broken by sort order
    select id, label
    from rates
    order by (comps::numeric / nullif(days_active, 0)) asc nulls last, sort_order asc
    limit 1
  )
  select
    (
      select count(*)::int
      from completion c
      join active a on a.id = c.routine_item_id
      where c.day = p_day
    ) as done,
    (select count(*)::int from active) as total,
    (select label from focus) as focus_label,
    (select id from focus) as focus_item_id;
$$;

-- anon stays inert (#108): only the signed-in role may call this. Supabase's default
-- privileges grant `anon` explicitly, so revoke from both public and anon.
revoke execute on function public.widget_summary(date) from public, anon;
grant execute on function public.widget_summary(date) to authenticated;
