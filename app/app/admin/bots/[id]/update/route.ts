import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';

export async function POST(req: Request, context: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.redirect(new URL('/app/admin', req.url));
  const id = context.params.id;
  const form = await req.formData();
  const name = String(form.get('name') || '');
  const description = String(form.get('description') || '');
  const model = String(form.get('model') || '');
  const system = String(form.get('system') || '');
  const temperature = Number(form.get('temperature') ?? 1);
  if (!name || !model || !system) return NextResponse.redirect(new URL(`/app/admin/bots/${id}`, req.url));
  await fetch(new URL(`/api/bots/${id}`, req.url), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, model, system, temperature }),
  });
  return NextResponse.redirect(new URL(`/app/admin?saved=1`, req.url));
}


