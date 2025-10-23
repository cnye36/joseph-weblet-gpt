import Link from "next/link";
import ChatList from "./ChatList";
import { Separator } from "@/components/ui/separator";
import { defaultBotId, type BotId } from "@/lib/bots";
import LogoutButton from "@/components/sidebar/LogoutButton";
import { SidebarFooter, SidebarProvider } from "@/components/ui/sidebar";
import { NavUser } from "@/components/sidebar/NavUser";
import { createClient } from "@/lib/supabase/server";

export default async function Sidebar({
  selectedBot,
}: {
  selectedBot?: BotId;
}) {
  const bot: BotId = (selectedBot ?? defaultBotId) as BotId;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) return null;

  // Fetch user profile for avatar and name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";
  const email = user?.email || "user@example.com";
  const avatar =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(email)}`;

  return (
    <aside className="border-r flex flex-col h-svh">
      <div className="p-4 space-y-4 flex-1 overflow-auto">
        <Link href="/app" className="font-medium">
          Chatbots
        </Link>
        <Separator />
        <ChatList selectedBot={bot} />
      </div>

      <div className="border-t bg-background w-full">
        <div className="p-3">
          <SidebarProvider>
            <SidebarFooter className="p-0">
              <NavUser user={{ name: displayName, email, avatar }} />
            </SidebarFooter>
          </SidebarProvider>
          <div className="pt-2">
            <LogoutButton />
          </div>
        </div>
      </div>
    </aside>
  );
}


