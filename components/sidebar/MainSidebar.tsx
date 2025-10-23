import Link from "next/link";
import Image from "next/image";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
// Separator removed as it's no longer used
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { NavUser } from "@/components/sidebar/NavUser";
import { Home, Settings } from "lucide-react";
import GPTsAccordion from "@/components/sidebar/GPTsAccordion";
import { bots as staticBots } from "@/lib/bots";

export default async function MainSidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = await isAdmin();

  if (!user) return null;

  // Fetch user profile for avatar and name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const name =
    profile?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";
  const email = user?.email || "user@example.com";
  const avatar =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(email)}`;

  // Fetch all bots from database
  const { data: dbBots } = await supabase
    .from("bots")
    .select("id, name")
    .order("id");

  // Fallback to static bots if no bots in database
  const botsList =
    dbBots && dbBots.length > 0
      ? dbBots
      : Object.values(staticBots).map((b) => ({
          id: b.id,
          name: b.name,
        }));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/"
          className="flex items-center gap-3 px-2 py-1 hover:bg-accent/50 rounded-md transition-colors"
        >
          <Image
            src="/logo.png"
            alt="Weblet GPT"
            width={32}
            height={32}
            className="rounded-full shadow"
            priority
          />
          <span className="font-semibold tracking-tight bg-clip-text text-transparent bg-[image:var(--gradient)] group-data-[collapsible=icon]:hidden">
            Weblet GPT
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/app">
                  <Home className="size-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <GPTsAccordion bots={botsList} />
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter>
        {admin && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/app/admin">
                  <Settings className="size-4" />
                  <span>Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <NavUser user={{ name, email, avatar }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
