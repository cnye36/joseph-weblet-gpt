import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import { generateBotAvatar } from "@/lib/avatar-generation";

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.redirect(new URL("/app/admin", req.url));
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  const description = String(form.get("description") || "").trim();
  const model = String(form.get("model") || "").trim();
  const system = String(form.get("system") || "").trim();
  const temperature = Number(form.get("temperature") ?? 0.3);
  if (!name || !model || !system)
    return NextResponse.redirect(new URL("/app/admin/bots/new", req.url));

  // Generate a unique ID from the bot name
  const id =
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters except spaces and hyphens
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, "") + // Remove leading/trailing hyphens
    "-" +
    Date.now().toString(36); // Add timestamp to ensure uniqueness

  const supabase = await createClient();

  // Generate avatar for the new bot
  let avatarUrl: string | null = null;
  try {
    avatarUrl = await generateBotAvatar({
      botName: name,
      botDescription: description,
      botSystem: system,
      style: "professional",
    });
  } catch (error) {
    console.error("Error generating avatar:", error);
    // Continue without avatar if generation fails
  }

  const { error } = await supabase.from("bots").insert({
    id,
    name,
    description,
    model,
    system,
    temperature,
    avatar_url: avatarUrl,
  });
  if (error)
    return NextResponse.redirect(new URL("/app/admin?error=1", req.url));
  return NextResponse.redirect(new URL("/app/admin?saved=1", req.url));
}


