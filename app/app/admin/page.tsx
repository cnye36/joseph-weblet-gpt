import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";

async function BotsTable() {
  const supabase = await createClient();
  const { data } = await supabase.from('bots').select('id, name, model');
  return (
    <div className="space-y-2">
      {data?.map((b) => (
        <div key={b.id} className="flex items-center justify-between border p-3 rounded">
          <div>
            <div className="font-medium">{b.name}</div>
            <div className="text-xs text-muted-foreground">{b.id} · {b.model}</div>
          </div>
          <Link className="text-sm underline" href={`/app/admin/bots/${b.id}`}>Edit</Link>
        </div>
      ))}
    </div>
  );
}

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return <div className="p-6">Forbidden</div>;
  }
  return (
    <div className="p-6 space-y-4">
      <div className="text-lg font-medium">Admin · Bots</div>
      <BotsTable />
    </div>
  );
}


