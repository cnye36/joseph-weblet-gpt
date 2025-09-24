-- Bots configuration table
create table if not exists public.bots (
  id text primary key,
  name text not null,
  description text default '' not null,
  model text not null,
  system text not null,
  temperature real not null default 1.0,
  created_at timestamptz not null default now()
);

-- Backfill/compatibility: add columns if missing in existing environments
alter table public.bots add column if not exists description text default '' not null;
alter table public.bots add column if not exists temperature real not null default 1.0;

-- Optional indexes
create index if not exists idx_bots_model on public.bots(model);


