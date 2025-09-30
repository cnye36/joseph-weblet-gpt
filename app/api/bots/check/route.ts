import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { bots } from '@/lib/bots';

export async function POST(req: NextRequest) {
  try {
    const { botId } = await req.json();

    if (!botId || typeof botId !== 'string') {
      return NextResponse.json({ error: 'Invalid bot ID' }, { status: 400 });
    }

    // Check if bot exists in static bots
    if (botId in bots) {
      return NextResponse.json({ exists: true, isStatic: true });
    }

    // Check if bot exists in database
    const supabase = await createClient();
    const { data } = await supabase
      .from('bots')
      .select('id')
      .eq('id', botId)
      .maybeSingle();

    return NextResponse.json({ 
      exists: !!data, 
      isStatic: false 
    });

  } catch (error) {
    console.error('Error checking bot existence:', error);
    return NextResponse.json(
      { error: 'Failed to check bot existence' },
      { status: 500 }
    );
  }
}
