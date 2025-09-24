import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { bots as staticBots } from "@/lib/bots";
import LogoutButton from "@/components/sidebar/LogoutButton";

export default async function AppDashboard() {
  const supabase = await createClient();
  const admin = await isAdmin();
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
    <div className="p-6">
      <header className="max-w-5xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded bg-primary/15 flex items-center justify-center">
            <span className="font-bold text-primary">W</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Weblet GPT</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Choose an assistant to get started
          </span>
          <LogoutButton />
        </div>
      </header>
      <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((b) => (
          <Link key={b.id} href={`/app/chat/${b.id}`} className="block">
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardContent className="p-5 space-y-2">
                <div className="font-medium">{b.name}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {b.description || b.system}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {admin && (
        <Link
          href="/app/admin"
          className="fixed left-4 bottom-4 text-xs underline px-2 py-1 rounded border bg-background"
        >
          Admin
        </Link>
      )}
    </div>
  );
}
