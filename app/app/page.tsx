import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { bots as staticBots } from "@/lib/bots";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import MainSidebar from "@/components/sidebar/MainSidebar";
import AppBotList from "@/components/AppBotList";

export default async function AppDashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
  const search = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';
  const limit = 12;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = await createClient();
  await isAdmin();

  // Check if DB has any bots
  const { count: totalDbBots } = await supabase
    .from("bots")
    .select('*', { count: 'exact', head: true });

  interface Bot {
    id: string;
    name: string;
    description: string;
    system: string;
    avatar_url: string | null;
  }

  let bots: Bot[] = [];
  let totalCount = 0;

  if (totalDbBots && totalDbBots > 0) {
     // DB Mode
     let query = supabase
        .from("bots")
        .select("id, name, description, system, avatar_url", { count: 'exact' });

     if (search) {
        query = query.ilike('name', `%${search}%`);
     }

     const { data, count } = await query
        .order("id")
        .range(from, to);
     
     bots = data || [];
     totalCount = count || 0;
  } else {
     // Static Mode
     const allStatic = Object.values(staticBots).map((b) => ({
          id: b.id,
          name: b.name,
          description: "",
          system: b.system,
          avatar_url: null,
        }));
     
     const filtered = search 
        ? allStatic.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
        : allStatic;
     
     totalCount = filtered.length;
     bots = filtered.slice(from, from + limit);
  }

  const totalPages = Math.ceil(totalCount / limit);

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
          <AppBotList bots={bots} currentPage={page} totalPages={totalPages} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
