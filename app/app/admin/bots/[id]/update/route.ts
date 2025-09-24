import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin()))
    return NextResponse.redirect(new URL("/app/admin", req.url));
  const id = (await context.params).id;
  const form = await req.formData();
  const name = String(form.get("name") || "");
  const description = String(form.get("description") || "");
  const model = String(form.get("model") || "");
  const system = String(form.get("system") || "");
  const temperature = Number(form.get("temperature") ?? 1);
  if (!name || !model || !system)
    return NextResponse.redirect(new URL(`/app/admin/bots/${id}`, req.url));
  const supabase = await createClient();
  const { error } = await supabase
    .from("bots")
    .update({ name, description, model, system, temperature })
    .eq("id", id);
  if (error)
    return NextResponse.redirect(new URL(`/app/admin?error=1`, req.url));
  return NextResponse.redirect(new URL(`/app/admin?saved=1`, req.url));
}


