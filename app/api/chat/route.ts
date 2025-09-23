import { openrouter } from '@/lib/openrouter';
import { bots, type BotId, defaultBotId } from '@/lib/bots';
import { streamText, type CoreMessage } from 'ai';
import { z } from 'zod';

const BodySchema = z.object({
  botId: z.custom<BotId>().optional(),
  // Accept UI messages (with parts) or other shapes; we only require role and passthrough the rest
  messages: z.array(z.object({ role: z.enum(['user', 'assistant', 'system']) }).passthrough()),
});

export const runtime = 'edge';

export async function POST(req: Request) {
  const json = await req.json();
  const { botId = defaultBotId, messages } = BodySchema.parse(json);
  const bot = bots[botId];

  

  // Normalize any incoming UI message shapes into simple text-only CoreMessage[]
  const coreMessages: CoreMessage[] = (Array.isArray(messages) ? messages : []).map((m: any) => {
    const parts: unknown = (m && Array.isArray(m.parts))
      ? m.parts
      : (m && Array.isArray(m.content))
        ? m.content
        : undefined;
    const textFromParts = Array.isArray(parts)
      ? parts
          .map((p: any) => {
            if (p && p.type === 'text' && typeof p.text === 'string') return p.text;
            if (p && p.type === 'image') return '[image attached]';
            return '';
          })
          .filter((s: string) => s.length > 0)
          .join('\n')
      : (typeof m?.content === 'string' ? m.content : '');
    return { role: m?.role ?? 'user', content: textFromParts } as CoreMessage;
  });

  const result = await streamText({
    model: openrouter(bot.model),
    system: bot.system,
    messages: coreMessages,
    providerOptions: {
      openrouter: {
        // example of extra body / usage toggles
        // reasoning: { max_tokens: 10 },
      },
    },
    headers: {
      // OpenRouter best-practice headers
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL,
      'X-Title': 'Joseph Weblet Chat',
    },
  });

  return result.toUIMessageStreamResponse();
}


