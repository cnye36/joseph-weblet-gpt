import Link from "next/link";
import ChatList from "./ChatList";
import { Separator } from "@/components/ui/separator";
import { defaultBotId, type BotId } from "@/lib/bots";

export default function Sidebar({ selectedBot }: { selectedBot?: BotId }) {
  const bot: BotId = (selectedBot ?? defaultBotId) as BotId;
  return (
    <aside className="border-r p-4 space-y-4">
      <Link href="/app" className="font-medium">Chatbots</Link>
      <Separator />
      {/* @ts-expect-error Async Server Component */}
      <ChatList selectedBot={bot} />
    </aside>
  );
}


