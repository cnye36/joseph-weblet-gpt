import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openrouter } from '@/lib/openrouter';
import { bots, defaultBotId, type BotId } from '@/lib/bots';
import { z } from 'zod';
import { createClient } from "@/lib/supabase/server";

type StoredBot = {
  id: string;
  name: string;
  description: string | null;
  model: string;
  system: string;
  temperature: number | null;
};

const Body = z.object({
  botId: z.custom<BotId>().optional(),
  prompt: z.string(),
});

async function resolveBot(botId: BotId) {
  if (bots[botId]) {
    return bots[botId];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("bots")
    .select("id, name, description, model, system, temperature")
    .eq("id", botId)
    .maybeSingle<StoredBot>();

  if (!data) {
    throw new Error("Bot not found");
  }

  return {
    id: data.id as BotId,
    name: data.name,
    model: data.model,
    system: data.system,
  };
}

export async function POST(req: Request) {
  const json = await req.json();
  const { botId = defaultBotId, prompt } = Body.parse(json);

  let bot;
  try {
    bot = await resolveBot(botId);
  } catch (error) {
    if (error instanceof Error && error.message === "Bot not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to resolve bot" },
      { status: 500 }
    );
  }

  const result = await streamText({
    model: openrouter(bot.model),
    system: `You are a helpful assistant that generates short 3-4 word titles for chats. Return only the title, no punctuation.`,
    messages: [
      {
        role: "user",
        content: `Create a short 3-4 word title for this chat based on the user's message: ${prompt}`,
      },
    ],
  });

  const full = await result.text;
  const title = full
    .trim()
    .replace(/[\n\r\.]+/g, "")
    .slice(0, 50);
  return NextResponse.json({ title });
}


