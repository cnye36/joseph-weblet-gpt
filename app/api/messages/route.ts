import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ListSchema = z.object({ chatId: z.string().uuid() });
const CreateSchema = z.object({
  chatId: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().default(""), // Default to empty string instead of optional
  parts: z.array(z.any()).optional(), // Allow parts array for rich messages
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");
  const { chatId: c } = ListSchema.parse({ chatId });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, parts, created_at")
    .eq("chat_id", c)
    .order("created_at", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { chatId, role, content, parts } = CreateSchema.parse(body);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Store parts if provided, otherwise use content as string
  const messageData: {
    chat_id: string;
    role: string;
    content: string;
    parts?: unknown[];
  } = {
    chat_id: chatId,
    role,
    content, // content is now guaranteed to be a string due to schema default
  };

  if (parts && Array.isArray(parts)) {
    messageData.parts = parts;
  }

  const { data, error } = await supabase
    .from("messages")
    .insert(messageData)
    .select("id")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}


