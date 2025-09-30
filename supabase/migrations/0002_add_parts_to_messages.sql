-- Add parts column to messages table for rich message content
alter table public.messages 
add column if not exists parts jsonb;