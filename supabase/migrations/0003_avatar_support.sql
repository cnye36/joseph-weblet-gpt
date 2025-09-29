-- Add avatar_url column to bots table
alter table public.bots add column if not exists avatar_url text;

-- Create storage bucket for bot avatars
insert into storage.buckets (id, name, public) 
values ('bot-avatars', 'bot-avatars', true)
on conflict (id) do nothing;

-- Set up RLS policies for bot-avatars bucket
create policy "Bot avatars are publicly readable"
on storage.objects for select
using (bucket_id = 'bot-avatars');

create policy "Anyone can upload bot avatars"
on storage.objects for insert
with check (bucket_id = 'bot-avatars');

create policy "Anyone can update bot avatars"
on storage.objects for update
using (bucket_id = 'bot-avatars');

create policy "Anyone can delete bot avatars"
on storage.objects for delete
using (bucket_id = 'bot-avatars');
