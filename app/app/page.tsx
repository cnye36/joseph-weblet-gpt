import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { bots as staticBots } from "@/lib/bots";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import MainSidebar from "@/components/sidebar/MainSidebar";
import AppBotList from "@/components/AppBotList";

export default async function AppDashboard() {
  const supabase = await createClient();
  await isAdmin();
  const { data } = await supabase
    .from("bots")
    .select("id, name, description, system, avatar_url")
    .order("id");
  const list =
    data && data.length > 0
      ? data
      : Object.values(staticBots).map((b) => ({
          id: b.id,
          name: b.name,
          description: "",
          system: b.system,
          avatar_url: null,
        }));
  return (
    <SidebarProvider>
      <MainSidebar />
      <SidebarInset>
        <div className="p-8">
          <header className="max-w-5xl mx-auto mb-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                Choose Your AI Companion
              </h1>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Select from our collection of specialized Weblets designed for
                your specific domain and workflow needs.
              </p>
            </div>
          </header>
          <AppBotList bots={list} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
