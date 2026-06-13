-- 0009 — note + journal pinning (#135).
-- A `pin_order` integer on each pinnable row: NULL = not pinned; an integer =
-- its position in the "pinned" view (lower = higher up). The order is a single
-- sequence shared across notes AND journals so the pinned view interleaves both
-- by pin_order. Pinning never touches the main reverse-chron stream — pinned
-- items still appear in their normal date position there, unmarked (David's call).
--
-- Additive columns only; existing RLS on note/journal (authenticated, #108)
-- covers them. Reads tolerate the column being absent (deploy-before-migration).

alter table public.note add column if not exists pin_order integer;
alter table public.journal add column if not exists pin_order integer;

-- Partial indexes — the pinned view only ever filters/sorts the pinned rows.
create index if not exists note_pin_order_idx on public.note (pin_order)
  where pin_order is not null;
create index if not exists journal_pin_order_idx on public.journal (pin_order)
  where pin_order is not null;
