import { bots, defaultBotId, type BotId } from "@/lib/bots";
import Chat from "@/components/chat/Chat";
import Sidebar from "@/components/sidebar/Sidebar";
import { redirect } from "next/navigation";

export default function ChatBotScopedPage({ params, searchParams }: { params: { bot: string }, searchParams: { chat?: string } }) {
  const rawBot = params.bot || "";
  const selectedBot = (rawBot && rawBot in bots ? (rawBot as BotId) : defaultBotId);
  if (!(rawBot in bots)) {
    const to = `/app/chat/${selectedBot}${searchParams.chat ? `?chat=${searchParams.chat}` : ""}`;
    redirect(to);
  }
  const chatId = searchParams.chat ?? null;
  const bot = bots[selectedBot];

  return (
    <div className="grid grid-cols-[280px_1fr] min-h-svh">
      <Sidebar selectedBot={selectedBot} />
      <div className="flex flex-col h-svh">
        <div className="border-b px-4 py-3 text-sm">{bot.name}</div>
        <Chat botId={selectedBot} chatId={chatId} />
      </div>
    </div>
  );
}


