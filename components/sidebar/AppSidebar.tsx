import { NavUser } from "@/components/sidebar/NavUser"
import ChatList from "@/components/sidebar/ChatList"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"
import { defaultBotId, type BotId } from "@/lib/bots"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { isAdmin } from "@/lib/admin"

export default async function AppSidebar({ selectedBot }: { selectedBot?: BotId }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const bot: BotId = (selectedBot ?? defaultBotId) as BotId;
  const name = user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "user@example.com";
  const avatar = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(email)}`;
  const admin = await isAdmin();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/app" className="font-medium px-2 py-1">Chatbots</Link>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-2">
          <Separator className="my-2" />
          <ChatList selectedBot={bot} />
        </div>
      </SidebarContent>
      <SidebarFooter>
        {admin && (
          <Link href="/app/admin" className="text-xs underline px-2 py-1 rounded border bg-background mb-2 inline-block">
            Admin
          </Link>
        )}
        <NavUser user={{ name, email, avatar }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
