create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  bot_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('system','user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- indexes
create index if not exists idx_chats_user_id on public.chats(user_id);
create index if not exists idx_messages_chat_id on public.messages(chat_id);

-- RLS
alter table public.chats enable row level security;
alter table public.messages enable row level security;

create policy if not exists "Users can manage own chats"
on public.chats
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "Users can manage own messages"
on public.messages
for all
to authenticated
using (exists (
  select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid()
))
with check (exists (
  select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid()
));


