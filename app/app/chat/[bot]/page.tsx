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
  const selectedBot =
    rawBot && rawBot in bots ? (rawBot as BotId) : defaultBotId;
  if (!(rawBot in bots)) {
    const to = `/app/chat/${selectedBot}${
      chatParam ? `?chat=${chatParam}` : ""
    }`;
    redirect(to);
  }
  const chatId = chatParam ?? null;
  const bot = bots[selectedBot];

  return (
    <SidebarProvider defaultOpen={false}>
      <MainSidebar />
      <SidebarInset>
        <div className="flex h-svh">
          <ChatSidebar selectedBot={selectedBot} />
          <div className="flex-1 flex flex-col min-h-0">
            <BotHeader botId={selectedBot} fallbackName={bot.name} />
            <div className="flex-1 min-h-0">
              <Chat botId={selectedBot} chatId={chatId} />
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
  botId: BotId;
  fallbackName: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bots")
    .select("name, avatar_url")
    .eq("id", botId)
    .maybeSingle();
  return (
    <div className="border-b px-4 py-3 text-sm flex items-center space-x-3">
      {data?.avatar_url ? (
        <Image
          src={data.avatar_url}
          alt={`${data.name || fallbackName} avatar`}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover border border-gray-200"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
          {(data?.name || fallbackName).charAt(0)}
        </div>
      )}
      <span>{data?.name ?? fallbackName}</span>
    </div>
  );
}


