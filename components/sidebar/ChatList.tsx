import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import NewChatButton from "@/components/sidebar/NewChatButton";
import { bots, defaultBotId, type BotId } from "@/lib/bots";

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
        <Link key={c.id} href={`/app/chat/${c.bot_id}?chat=${c.id}`} className="block">{c.title}</Link>
      ))}
    </nav>
  );
}


