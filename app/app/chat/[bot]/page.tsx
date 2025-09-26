import { bots, defaultBotId, type BotId } from "@/lib/bots";
import { createClient } from "@/lib/supabase/server";
import Chat from "@/components/chat/Chat";
import ChatSidebar from "@/components/sidebar/ChatSidebar";
import MainSidebar from "@/components/sidebar/MainSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { redirect } from "next/navigation";

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
          <div className="flex-1 flex flex-col">
            <BotHeader botId={selectedBot} fallbackName={bot.name} />
            <Chat botId={selectedBot} chatId={chatId} />
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
    .select("name")
    .eq("id", botId)
    .maybeSingle();
  return (
    <div className="border-b px-4 py-3 text-sm">
      {data?.name ?? fallbackName}
    </div>
  );
}


