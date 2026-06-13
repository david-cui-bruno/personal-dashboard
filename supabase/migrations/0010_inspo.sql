-- 0010 — inspo board (#140): a mood/inspiration board tab. Two boards
-- (moodboard | people) of media items, each carrying colored sticky notes placed
-- on the image. Media bytes live in the existing public `attachments` bucket under
-- an `inspo/` prefix (#103); these tables hold the metadata + sticky annotations.
-- RLS: authenticated-only, like every table (#108). Build brief: docs/inspo.md.

create table if not exists public.inspo_item (
  id uuid primary key default gen_random_uuid(),
  board text not null check (board in ('moodboard', 'people')),
  kind text not null default 'image' check (kind in ('image', 'video')), -- video = phase 2
  storage_path text not null,                  -- path in the attachments bucket
  width integer,                               -- intrinsic px (masonry reserves aspect)
  height integer,
  sort_order integer not null default 0,       -- manual order within a board
  created_at timestamptz not null default now()
);

create table if not exists public.inspo_sticky (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inspo_item(id) on delete cascade,
  color text not null check (color in ('yellow', 'blue', 'orange', 'pink', 'green')),
  text text not null default '',
  x real not null,            -- fraction 0..1 of image width (sticky top-left)
  y real not null,            -- fraction 0..1 of image height
  rotation real not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists inspo_item_board_idx on public.inspo_item (board, sort_order);
create index if not exists inspo_sticky_item_idx on public.inspo_sticky (item_id);

alter table public.inspo_item enable row level security;
alter table public.inspo_sticky enable row level security;

drop policy if exists inspo_item_auth on public.inspo_item;
drop policy if exists inspo_sticky_auth on public.inspo_sticky;
create policy inspo_item_auth on public.inspo_item
  for all to authenticated using (true) with check (true);
create policy inspo_sticky_auth on public.inspo_sticky
  for all to authenticated using (true) with check (true);
