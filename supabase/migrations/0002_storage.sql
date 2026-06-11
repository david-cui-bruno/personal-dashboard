-- 0002 — Storage bucket for inline images in journals & notes (#050).
-- Additive migration owned by the Notes slice (docs/phase-1.md · slice 2). The
-- `attachment` table from 0001 tracks rows for cleanup; the bytes live here.

-- Public bucket: a rendered <img src> uses a stable public URL that never
-- expires, so stored TipTap content keeps resolving (vs. expiring signed URLs).
-- Single-user app behind auth (#070); paths are randomized + opaque.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- The one account (#070) may manage attachments; reads are public via the bucket.
-- Policies are idempotent so the migration is safe to re-apply.
drop policy if exists "attachments read" on storage.objects;
create policy "attachments read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'attachments');

drop policy if exists "attachments insert" on storage.objects;
create policy "attachments insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments');

drop policy if exists "attachments update" on storage.objects;
create policy "attachments update" on storage.objects
  for update to authenticated
  using (bucket_id = 'attachments')
  with check (bucket_id = 'attachments');

drop policy if exists "attachments delete" on storage.objects;
create policy "attachments delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments');
