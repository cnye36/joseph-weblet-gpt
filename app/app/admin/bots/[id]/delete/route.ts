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
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("bots")
    .delete()
    .eq("id", id);
  
  if (error) {
    console.error('Error deleting bot:', error);
    return NextResponse.redirect(new URL(`/app/admin?error=1`, req.url));
  }
  
  return NextResponse.redirect(new URL(`/app/admin?deleted=1`, req.url));
}
