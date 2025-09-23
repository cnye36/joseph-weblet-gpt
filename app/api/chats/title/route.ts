import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openrouter } from '@/lib/openrouter';
import { bots, defaultBotId, type BotId } from '@/lib/bots';
import { z } from 'zod';

const Body = z.object({
  botId: z.custom<BotId>().optional(),
  prompt: z.string(),
});

export async function POST(req: Request) {
  const json = await req.json();
  const { botId = defaultBotId, prompt } = Body.parse(json);
  const bot = bots[botId];

  const result = await streamText({
    model: openrouter(bot.model),
    system: `You are a helpful assistant that generates short 3-4 word titles for chats. Return only the title, no punctuation.`,
    messages: [{ role: 'user', content: `Create a short 3-4 word title for this chat based on the user's message: ${prompt}` }],
  });

  const full = await result.text;
  const title = full.trim().replace(/[\n\r\.]+/g, '').slice(0, 50);
  return NextResponse.json({ title });
}


