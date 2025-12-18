import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { defaultBotId } from "@/lib/bots";
import ChatListItemActions from "@/components/sidebar/ChatListItemActions";

export default async function ChatList({ selectedBot }: { selectedBot?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Use the selectedBot directly if provided, otherwise fall back to defaultBotId
  const bot: string = selectedBot || defaultBotId;

  const { data } = await supabase
    .from("chats")
    .select("id, title, bot_id, competition_id, is_competition_chat")
    .eq("user_id", user.id)
    .eq("bot_id", bot)
    .order("created_at", { ascending: false });

  return (
    <nav className="text-sm space-y-1">
      {data?.map((c) => {
        const params = new URLSearchParams();
        params.set("chat", c.id);
        if (c.competition_id) {
          params.set("competitionId", c.competition_id);
        }

        return (
          <div key={c.id} className="flex items-center justify-between group">
            <Link
              href={`/app/chat/${c.bot_id}?${params.toString()}`}
              className="block truncate flex-1 pr-2 hover:bg-accent rounded px-2 py-1"
            >
              {c.title}
            </Link>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ChatListItemActions
                chatId={c.id}
                botId={c.bot_id}
                title={c.title}
              />
            </div>
          </div>
        );
      })}
    </nav>
  );
}
