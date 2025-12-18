import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CreateChatSchema = z.object({
  botId: z.string(),
  title: z.string().default('New Chat'),
  competitionId: z.string().uuid().optional(),
});

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const competitionId = searchParams.get('competitionId');

  let query = supabase
    .from('chats')
    .select('id, title, bot_id, created_at, competition_id, is_competition_chat')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (competitionId) {
    query = query.eq('competition_id', competitionId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chats: data });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { botId, title, competitionId } = CreateChatSchema.parse(body);

  const insertData: {
    user_id: string;
    bot_id: string;
    title: string;
    competition_id?: string | null;
    is_competition_chat?: boolean;
  } = {
    user_id: user.id,
    bot_id: botId,
    title,
  };

  if (competitionId) {
    insertData.competition_id = competitionId;
    insertData.is_competition_chat = true;
  }

  const { data, error } = await supabase
    .from('chats')
    .insert(insertData)
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}


