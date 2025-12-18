import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ArrowLeft, Plus, Trophy, Bot } from "lucide-react";
import CompetitionsList from "@/components/admin/CompetitionsList";

export default async function AdminCompetitionsPage() {
  if (!(await isAdmin())) {
    return <div className="p-6">Forbidden</div>;
  }

  // Use admin client to bypass RLS and see all competitions
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all competitions for admin view
  const { data: competitions } = await supabaseAdmin
    .from("competitions")
    .select(`
      *,
      sponsors:competition_sponsors(count),
      submissions:competition_submissions(count)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 space-y-6">
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
          href="/app/admin/competitions/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Competition
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-6">
          <Link
            href="/app/admin"
            className="pb-3 border-b-2 border-transparent text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
          >
            <Bot className="w-4 h-4" />
            Bots & Weblets
          </Link>
          <div className="pb-3 border-b-2 border-blue-600 text-blue-600 font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Competitions
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        {!competitions || competitions.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <Trophy className="w-12 h-12 mx-auto text-gray-400" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No competitions yet
              </h3>
              <p className="text-sm text-gray-500">
                Create your first competition to get started
              </p>
            </div>
            <Link
              href="/app/admin/competitions/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Competition
            </Link>
          </div>
        ) : (
          <CompetitionsList competitions={competitions} />
        )}
      </div>
    </div>
  );
}
