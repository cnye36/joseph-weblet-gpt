import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ArrowLeft, Edit, Users, FileText } from "lucide-react";
import CompetitionForm from "@/components/admin/CompetitionForm";
import CompetitionEvaluator, {
  type CompetitionEvaluationSubmission,
} from "@/components/admin/CompetitionEvaluator";

export default async function AdminEditCompetitionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "edit" } = await searchParams;

  if (!(await isAdmin())) {
    return <div className="p-6">Forbidden</div>;
  }

  // Use admin client to bypass RLS and see all competitions
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch competition
  const { data: competition, error } = await supabaseAdmin
    .from("competitions")
    .select(`
      *,
      sponsors:competition_sponsors(*)
    `)
    .eq("id", id)
    .single();

  if (error || !competition) {
    return (
      <div className="p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Competition not found</h1>
          <Link
            href="/app/admin/competitions"
            className="text-blue-600 hover:underline"
          >
            Back to competitions
          </Link>
        </div>
      </div>
    );
  }

  // Fetch all bots for the dropdown
  const { data: bots } = await supabaseAdmin
    .from("bots")
    .select("id, name, description, avatar_url")
    .order("name");

  // Fetch submissions
  const { data: submissionsRaw } = await supabaseAdmin
    .from("competition_submissions")
    .select(`
      *,
      user:auth.users!user_id(email),
      evaluations:competition_evaluations(*)
    `)
    .eq("competition_id", id)
    .order("submitted_at", { ascending: false });

  const submissions =
    (submissionsRaw as unknown as CompetitionEvaluationSubmission[]) || [];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Link
          href="/app/admin/competitions"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Competitions
        </Link>
        <div className="text-lg font-medium">
          {competition.title}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          <Link
            href={`/app/admin/competitions/${id}?tab=edit`}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              tab === "edit"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Edit className="w-4 h-4" />
            Edit Details
          </Link>
          <Link
            href={`/app/admin/competitions/${id}?tab=submissions`}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              tab === "submissions"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            Submissions ({submissions.length})
          </Link>
        </div>
      </div>

      {/* Tab Content */}
      {tab === "edit" && <CompetitionForm bots={bots || []} competition={competition} />}

      {tab === "submissions" && (
        <CompetitionEvaluator
          competitionId={id}
          competition={competition}
          submissions={submissions}
        />
      )}
    </div>
  );
}
