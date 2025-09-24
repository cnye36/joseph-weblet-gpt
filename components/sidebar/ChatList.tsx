import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import NewChatButton from "@/components/sidebar/NewChatButton";
import { bots, defaultBotId, type BotId } from "@/lib/bots";
import ChatListItemActions from "@/components/sidebar/ChatListItemActions";

export default async function ChatList({ selectedBot }: { selectedBot?: BotId }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const bot: BotId = (selectedBot && (selectedBot in bots) ? selectedBot : defaultBotId);

  const { data } = await supabase
    .from('chats')
    .select('id, title, bot_id')
		.eq('user_id', user.id)
		.eq('bot_id', bot)
    .order('created_at', { ascending: false });

  return (
    <nav className="text-sm space-y-2">
      <Link href="/app" className="block">All GPTs</Link>
      <Separator className="my-2" />
      <NewChatButton />
      <Separator className="my-2" />
      {data?.map((c) => (
        <div key={c.id} className="flex items-center justify-between group">
          <Link href={`/app/chat/${c.bot_id}?chat=${c.id}`} className="block truncate flex-1 pr-2">
            {c.title}
          </Link>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ChatListItemActions chatId={c.id} botId={c.bot_id} title={c.title} />
          </div>
        </div>
      ))}
    </nav>
  );
}


