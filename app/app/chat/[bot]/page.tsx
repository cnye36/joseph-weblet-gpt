import { bots, defaultBotId, type BotId } from "@/lib/bots";
import { createClient } from "@/lib/supabase/server";
import Chat from "@/components/chat/Chat";
import ChatSidebar from "@/components/sidebar/ChatSidebar";
import MainSidebar from "@/components/sidebar/MainSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function ChatBotScopedPage({
  params,
  searchParams,
}: {
  params: Promise<{ bot: string }>;
  searchParams: Promise<{ chat?: string }>;
}) {
  const { bot: rawBot } = await params;
  const { chat: chatParam } = await searchParams;

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
    const to = `/app/chat/${selectedBot}${
      chatParam ? `?chat=${chatParam}` : ""
    }`;
    redirect(to);
  }

  const chatId = chatParam ?? null;
  const bot = botData || bots[selectedBot];

  return (
    <SidebarProvider defaultOpen={false} className="h-svh overflow-hidden">
      <MainSidebar />
      <SidebarInset>
        <div className="flex h-full overflow-hidden">
          <div className="flex-shrink-0 h-full overflow-hidden">
            <ChatSidebar selectedBot={rawBot} />
          </div>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <BotHeader botId={selectedBot} fallbackName={bot.name} />
            <div className="flex-1 min-h-0">
              <Chat botId={rawBot} chatId={chatId} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
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


