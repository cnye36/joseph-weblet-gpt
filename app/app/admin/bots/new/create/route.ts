import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.redirect(new URL('/app/admin', req.url));
  const form = await req.formData();
  const id = String(form.get('id') || '').trim();
  const name = String(form.get('name') || '').trim();
  const description = String(form.get('description') || '').trim();
  const model = String(form.get('model') || '').trim();
  const system = String(form.get('system') || '').trim();
  const temperature = Number(form.get('temperature') ?? 1);
  if (!id || !name || !model || !system) return NextResponse.redirect(new URL('/app/admin/bots/new', req.url));
  const supabase = await createClient();
  const { error } = await supabase
    .from('bots')
    .insert({ id, name, description, model, system, temperature });
  if (error) return NextResponse.redirect(new URL('/app/admin?error=1', req.url));
  return NextResponse.redirect(new URL('/app/admin?saved=1', req.url));
}


