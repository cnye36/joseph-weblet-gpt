-- Add competition context fields to chats
alter table public.chats
  add column if not exists competition_id uuid references public.competitions(id) on delete set null,
  add column if not exists is_competition_chat boolean not null default false;

-- Helpful indexes for competition-related queries
create index if not exists idx_chats_competition_id on public.chats(competition_id);
create index if not exists idx_chats_is_competition_chat on public.chats(is_competition_chat);


