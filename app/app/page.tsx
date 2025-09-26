import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { bots as staticBots } from "@/lib/bots";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import MainSidebar from "@/components/sidebar/MainSidebar";

export default async function AppDashboard() {
  const supabase = await createClient();
  await isAdmin();
  const { data } = await supabase
    .from("bots")
    .select("id, name, description, system")
    .order("id");
  const list =
    data && data.length > 0
      ? data
      : Object.values(staticBots).map((b) => ({
          id: b.id,
          name: b.name,
          description: "",
          system: b.system,
        }));
  return (
    <SidebarProvider>
      <MainSidebar />
      <SidebarInset>
        <div className="p-8">
          <header className="max-w-5xl mx-auto mb-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                Choose Your AI Assistant
              </h1>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Select from our collection of specialized GPTs designed for your
                specific domain and workflow needs.
              </p>
            </div>
          </header>
          <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((b) => (
              <Link
                key={b.id}
                href={`/app/chat/${b.id}`}
                className="block group h-full"
              >
                <div className="relative rounded-xl p-[2px] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 transition-all duration-300 hover:scale-105 h-full">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"></div>
                  <Card className="relative bg-white border-white/0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-xl h-full flex flex-col">
                    <CardContent className="p-6 space-y-3 flex-1 flex flex-col">
                      <div className="font-semibold text-lg text-neutral-900">
                        {b.name}
                      </div>
                      <div className="text-sm text-neutral-600 line-clamp-3 leading-relaxed flex-1">
                        {b.description || b.system}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
