import { bots, defaultBotId, type BotId } from "@/lib/bots";
import { createClient } from "@/lib/supabase/server";
import Chat from "@/components/chat/Chat";
import ChatSidebar from "@/components/sidebar/ChatSidebar";
import AppHeader from "@/components/header/AppHeader";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function ChatBotScopedPage({
  params,
  searchParams,
}: {
  params: Promise<{ bot: string }>;
  searchParams: Promise<{ chat?: string; competitionId?: string }>;
}) {
  const { bot: rawBot } = await params;
  const { chat: chatParam, competitionId } = await searchParams;

  // Check if bot exists in static bots or database
  let botExists = rawBot && rawBot in bots;
  let botData = null;

  if (!botExists) {
    // Check database for dynamically created bots
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("bots")
        .select("id, name, description, model, system, temperature")
        .eq("id", rawBot)
        .maybeSingle();

      if (data) {
        botExists = true;
        botData = data;
      }
    } catch (error) {
      console.error("Error checking bot in database:", error);
    }
  }

  const selectedBot = botExists ? (rawBot as BotId) : defaultBotId;

  if (!botExists) {
    const to = `/app/chat/${selectedBot}${(() => {
      const params = new URLSearchParams();
      if (chatParam) params.set("chat", chatParam);
      if (competitionId) params.set("competitionId", competitionId);
      const query = params.toString();
      return query ? `?${query}` : "";
    })()}`;
    redirect(to);
  }

  const chatId = chatParam ?? null;
  const bot = botData || bots[selectedBot];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-shrink-0 h-full min-h-0 overflow-hidden border-r bg-white">
          <ChatSidebar selectedBot={rawBot} />
        </div>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <BotHeader botId={selectedBot} fallbackName={bot.name} />
          <div className="flex-1 min-h-0">
            <Chat botId={rawBot} chatId={chatId} />
          </div>
        </div>
      </div>
    </div>
  );
}

async function BotHeader({
  botId,
  fallbackName,
}: {
  botId: string;
  fallbackName: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bots")
    .select("name, avatar_url, description, model")
    .eq("id", botId)
    .maybeSingle();

  // Truncate description to first ~15 words
  const truncateDescription = (desc: string | null | undefined) => {
    if (!desc) return null;
    const words = desc.split(/\s+/);
    if (words.length <= 15) return desc;
    return words.slice(0, 15).join(" ") + "...";
  };

  const truncatedDesc = truncateDescription(data?.description);

  return (
    <div className="border-b px-4 py-3 flex items-center space-x-3">
      {data?.avatar_url ? (
        <Image
          src={data.avatar_url}
          alt={`${data.name || fallbackName} avatar`}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {(data?.name || fallbackName).charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{data?.name ?? fallbackName}</div>
        {truncatedDesc && (
          <div className="text-xs text-muted-foreground line-clamp-1">
            {truncatedDesc}
          </div>
        )}
        {data?.model && (
          <div className="text-xs text-muted-foreground/80 mt-0.5">
            Model: {data.model}
          </div>
        )}
      </div>
    </div>
  );
}

