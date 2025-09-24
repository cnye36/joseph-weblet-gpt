import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  // table: bots(id text pk, name text, description text, model text, system text, temperature real, created_at)
  const { data, error } = await supabase
    .from("bots")
    .select("id, name, description, model, system, temperature")
    .order("id");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bots: data ?? [] });
}


