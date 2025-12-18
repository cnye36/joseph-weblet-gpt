import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";
import { ArrowLeft, Trophy, Bot, Plus } from "lucide-react";
import BotList from "@/components/admin/BotList";

async function BotsTable() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bots")
    .select("id, name, description, model, temperature, avatar_url");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Link
          href="/app/admin/bots/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Weblet
        </Link>
      </div>
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
      {data && data.length > 0 && <BotList bots={data} />}
    </div>
  );
}

export default async function AdminPage(props: {
  searchParams?: Promise<{ synced?: string; saved?: string; deleted?: string }>;
}) {
  const searchParams = await props.searchParams;
  if (!(await isAdmin())) {
    return <div className="p-6">Forbidden</div>;
  }
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/app"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Link>
          <div className="text-lg font-medium">Admin</div>
        </div>
        <Link
          href="/app/admin/competitions"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Trophy className="w-4 h-4" />
          Manage Competitions
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-6">
          <div className="pb-3 border-b-2 border-blue-600 text-blue-600 font-medium flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Bots & Weblets
          </div>
          <Link
            href="/app/admin/competitions"
            className="pb-3 border-b-2 border-transparent text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            Competitions
          </Link>
        </div>
      </div>
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
      {searchParams?.deleted === "1" && (
        <div className="border rounded p-3 text-sm bg-red-50 text-red-800">
          Bot deleted successfully.
        </div>
      )}
      <BotsTable />
    </div>
  );
}


