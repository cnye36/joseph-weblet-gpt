import ChatList from "@/components/sidebar/ChatList";
import NewChatButton from "@/components/sidebar/NewChatButton";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { defaultBotId, type BotId } from "@/lib/bots";
import { createClient } from "@/lib/supabase/server";

export default async function ChatSidebar({
  selectedBot,
}: {
  selectedBot?: BotId;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const bot: BotId = (selectedBot ?? defaultBotId) as BotId;

  if (!user) return null;

  return (
    <Sidebar collapsible="none" className="w-80 border-r">
      <SidebarHeader>
        <div className="px-2 py-1">
          <h3 className="font-medium text-sm">Chat History</h3>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-2">
          <NewChatButton />
          <ChatList selectedBot={bot} />
        </div>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
