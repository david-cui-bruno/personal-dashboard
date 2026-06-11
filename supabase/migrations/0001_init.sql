-- notes — initial schema. See docs/data-model.md; #NNN refer to docs/decisions.md.
-- Single user (#070): RLS posture is handled in the auth slice (Phase 0/1) — see
-- docs/architecture.md. This migration defines the data shape and the FTS indexes.

create extension if not exists pg_trgm;

-- routine template (#010, #016). Active on day D iff
-- created_on <= D and (archived_on is null or archived_on > D).
create table routine_item (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  sort_order  int not null default 0,
  created_on  date not null default current_date,
  archived_on date,
  created_at  timestamptz not null default now()
);

-- a checked item on a day; a row exists iff the item was checked that day.
create table completion (
  id              uuid primary key default gen_random_uuid(),
  routine_item_id uuid not null references routine_item(id) on delete cascade,
  day             date not null,
  completed_at    timestamptz not null default now(),
  unique (routine_item_id, day)
);
create index completion_day_idx on completion (day);

-- one journal per day, materialized only when written (#030, #100).
create table journal (
  id           uuid primary key default gen_random_uuid(),
  day          date not null unique,
  content      jsonb,
  content_text text not null default '',
  updated_at   timestamptz not null default now(),
  fts tsvector generated always as (to_tsvector('english', coalesce(content_text, ''))) stored
);
create index journal_fts_idx on journal using gin (fts);

-- freeform notes with soft-delete / trash (#032, #034).
create table note (
  id           uuid primary key default gen_random_uuid(),
  title        text not null default '',
  content      jsonb,
  content_text text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  fts tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, ''))
  ) stored
);
create index note_fts_idx on note using gin (fts);
create index note_created_idx on note (created_at desc);

-- images embedded in a journal or note (#050); bytes live in Supabase Storage.
create table attachment (
  id           uuid primary key default gen_random_uuid(),
  owner_type   text not null check (owner_type in ('journal', 'note')),
  owner_id     uuid not null,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

-- singleton app settings (#063).
create table settings (
  id         int primary key default 1 check (id = 1),
  accent     text not null default '#3b6ef0',
  theme      text not null default 'light' check (theme in ('light', 'dark', 'system')),
  font       text not null default 'lato'  check (font in ('lato', 'system')),
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- fuzzy/typo-tolerant search on short fields (#040).
create index routine_item_label_trgm on routine_item using gin (label gin_trgm_ops);
