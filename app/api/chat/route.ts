import { openrouter } from '@/lib/openrouter';
import { bots, type BotId, defaultBotId } from '@/lib/bots';
import { createClient } from "@/lib/supabase/server";
import { streamText, type CoreMessage } from "ai";
import { z } from "zod";

const BodySchema = z.object({
  botId: z.custom<BotId>().optional(),
  // Accept UI messages (with parts) or other shapes; we only require role and passthrough the rest
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant", "system"]) }).passthrough()
  ),
});

export const runtime = "edge";

export async function POST(req: Request) {
  const json = await req.json();
  const { botId = defaultBotId, messages } = BodySchema.parse(json);
  // Load bot config from DB, fallback to static lib
  let bot = bots[botId];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("bots")
      .select("id, name, description, model, system, temperature")
      .eq("id", botId)
      .maybeSingle();
    if (data) {
      bot = {
        id: botId,
        name: data.name,
        model: data.model,
        system: data.system,
      } as typeof bot;
    }
  } catch {}

  // Normalize any incoming UI message shapes into simple text-only CoreMessage[]
  const coreMessages: CoreMessage[] = (
    Array.isArray(messages) ? messages : []
  ).map((m: { parts?: unknown; content?: unknown; role?: string }) => {
    const parts: unknown =
      m && Array.isArray(m.parts)
        ? m.parts
        : m && Array.isArray(m.content)
        ? m.content
        : undefined;
    const textFromParts = Array.isArray(parts)
      ? parts
          .map((p: { type: string; text?: string }) => {
            if (p && p.type === "text" && typeof p.text === "string")
              return p.text;
            if (p && p.type === "image") return "[image attached]";
            return "";
          })
          .filter((s: string) => s.length > 0)
          .join("\n")
      : typeof m?.content === "string"
      ? m.content
      : "";
    return { role: m?.role ?? "user", content: textFromParts } as CoreMessage;
  });

  const modelSlug = ((): string => {
    const raw = bot.model || "openrouter/auto";
    if (raw.includes("/")) return raw; // already provider-prefixed
    return `openai/${raw}`; // best-effort default provider
  })();

  const result = await streamText({
    model: openrouter(modelSlug),
    system: bot.system,
    messages: coreMessages,
    temperature: ((): number | undefined => {
      const maybe = (bot as unknown as { temperature?: unknown }).temperature;
      return typeof maybe === "number" ? maybe : undefined;
    })(),
    providerOptions: {
      openrouter: {
        // keep light; routing handled by selected model slug
        // example of extra body / usage toggles
      },
    },
    headers: {
      // OpenRouter best-practice headers
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL,
      "X-Title": "Joseph Weblet Chat",
    },
  });

  return result.toUIMessageStreamResponse();
}


