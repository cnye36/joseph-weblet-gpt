import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

const UpdateSchema = z.object({
  name: z.string().min(1),
  model: z.string().min(1),
  system: z.string().min(1),
});

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bots")
    .select("id, name, model, system")
    .eq("id", id)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ bot: data });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = await createClient();
  const json = await req.json();
  const body = UpdateSchema.parse(json);
  const { data, error } = await supabase
    .from("bots")
    .update({ name: body.name, model: body.model, system: body.system })
    .eq("id", id)
    .select("id, name, model, system")
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bot: data });
}
