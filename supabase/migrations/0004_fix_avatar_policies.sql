-- Drop existing policies if they exist
drop policy if exists "Bot avatars are publicly readable" on storage.objects;
drop policy if exists "Admins can upload bot avatars" on storage.objects;
drop policy if exists "Admins can update bot avatars" on storage.objects;
drop policy if exists "Admins can delete bot avatars" on storage.objects;
drop policy if exists "Anyone can upload bot avatars" on storage.objects;
drop policy if exists "Anyone can update bot avatars" on storage.objects;
drop policy if exists "Anyone can delete bot avatars" on storage.objects;

-- Create new policies with correct permissions
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
