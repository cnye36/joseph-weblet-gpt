import ChatList from "@/components/sidebar/ChatList";
import NewChatButton from "@/components/sidebar/NewChatButton";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { defaultBotId } from "@/lib/bots";
import { createClient } from "@/lib/supabase/server";

export default async function ChatSidebar({
  selectedBot,
}: {
  selectedBot?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const bot: string = selectedBot ?? defaultBotId;

  if (!user) return null;

  return (
    <SidebarProvider>
      <Sidebar collapsible="none" className="w-80 border-r h-full">
        <SidebarHeader className="flex-shrink-0">
          <div className="px-2 py-1">
            <h3 className="font-medium text-sm">Chat History</h3>
          </div>
        </SidebarHeader>
        <SidebarContent className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-2">
            <NewChatButton />
            <ChatList selectedBot={bot} />
          </div>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  );
}
