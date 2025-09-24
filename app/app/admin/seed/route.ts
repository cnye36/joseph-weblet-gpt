import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import { bots as staticBots } from '@/lib/bots';

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.redirect(new URL('/app/admin', req.url));
  const supabase = await createClient();
  const payload = Object.values(staticBots).map((b) => ({
    id: b.id,
    name: b.name,
    description: ((): string => {
      // Provide sensible default descriptions for each static bot
      switch (b.id) {
        case 'poster-creator-gpt':
          return 'Convert research articles into professional, conference-ready posters with field-appropriate templates.';
        case 'ganttrify-gpt':
          return 'Generate publication-quality Gantt charts from CSV/Excel/JSON with smart validation and templates.';
        case 'microbial-biochemistry-gpt':
          return 'Plan and interpret biochemical panels to identify microorganisms, with QC and confirmatory guidance.';
        default:
          return '';
      }
    })(),
    model: b.model,
    system: b.system,
    temperature: 1,
  }));
  await supabase.from('bots').upsert(payload, { onConflict: 'id' });
  return NextResponse.redirect(new URL('/app/admin?synced=1', req.url));
}


