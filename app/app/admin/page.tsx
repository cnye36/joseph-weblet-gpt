import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";

async function BotsTable() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bots")
    .select("id, name, description, model, temperature");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Link href="/app/admin/bots/new" className="text-sm underline">
          Add GPT
        </Link>
      </div>
      <form
        action="/app/admin/seed"
        method="post"
        className="flex items-center justify-between p-3 border rounded"
      >
        <div className="text-sm">Resync default bots (safe upsert)</div>
        <button className="text-sm underline cursor-pointer" type="submit">
          Run sync
        </button>
      </form>
      {(!data || data.length === 0) && (
        <form
          action="/app/admin/seed"
          method="post"
          className="p-3 border rounded"
        >
          <div className="text-sm mb-2">No bots found in the database.</div>
          <button className="text-sm underline cursor-pointer" type="submit">
            Sync default bots
          </button>
        </form>
      )}
      {data?.map((b) => (
        <Link key={b.id} href={`/app/admin/bots/${b.id}`} className="block">
          <div className="flex items-center justify-between border p-3 rounded hover:bg-muted/40">
            <div>
              <div className="font-medium">{b.name}</div>
              <div className="text-xs text-muted-foreground">
                {b.id} · {b.model}
              </div>
              {b.description ? (
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {b.description}
                </div>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">Click to edit</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function AdminPage(props: {
  searchParams?: Promise<{ synced?: string; saved?: string }>;
}) {
  const searchParams = await props.searchParams;
  if (!(await isAdmin())) {
    return <div className="p-6">Forbidden</div>;
  }
  return (
    <div className="p-6 space-y-4">
      <div className="text-lg font-medium">Admin · Bots</div>
      {searchParams?.synced === "1" && (
        <div className="border rounded p-3 text-sm bg-green-50 text-green-800">
          Defaults synced successfully.
        </div>
      )}
      {searchParams?.saved === "1" && (
        <div className="border rounded p-3 text-sm bg-green-50 text-green-800">
          Bot saved successfully.
        </div>
      )}
      <BotsTable />
    </div>
  );
}


