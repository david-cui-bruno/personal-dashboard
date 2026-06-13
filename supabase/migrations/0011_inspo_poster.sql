-- 0011 — inspo video poster (#144). An optional client-generated first-frame
-- thumbnail for video items (#142/#143): the tile renders this still instead of a
-- live <video>. Null for images, and for videos whose poster couldn't be generated
-- (the tile falls back to the first frame). Additive + idempotent; RLS unchanged
-- (column on an existing authenticated-only table, #108). Build brief: docs/inspo.md.
alter table public.inspo_item add column if not exists poster_path text;
