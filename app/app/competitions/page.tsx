import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Trophy, Calendar, Users, Award, TrendingUp } from "lucide-react";
import AppHeader from "@/components/header/AppHeader";

export default async function CompetitionsPage() {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch active and completed competitions
  // Use admin client so public users can see competitions without RLS issues,
  // while we still enforce visibility via explicit status filters.
  const { data: competitions } = await supabaseAdmin
    .from("competitions")
    .select(`
      *,
      sponsors:competition_sponsors(*),
      submission_count:competition_submissions(count)
    `)
    .in("status", ["active", "completed"])
    .order("start_date", { ascending: false });

  const activeCompetitions = competitions?.filter((c) => c.status === "active") || [];
  const completedCompetitions = competitions?.filter((c) => c.status === "completed") || [];

  // Get user's submission count (admin client to avoid RLS policy issues)
  let userSubmissionCount = 0;
  if (user) {
    const { count, error: submissionCountError } = await supabaseAdmin
      .from("competition_submissions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (submissionCountError) {
      console.error("Error counting user submissions:", submissionCountError);
    } else {
      userSubmissionCount = count || 0;
    }
  }

  // Calculate total submissions
  const totalSubmissions = competitions?.reduce(
    (sum, comp) => sum + (comp.submission_count?.[0]?.count || 0),
    0
  ) || 0;

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Competitions</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Compete with others using our AI-powered weblets. Show your skills,
            learn from the best, and win rewards!
          </p>
        </div>

        {/* Stats Section */}
        {user && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Trophy className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {activeCompetitions.length}
                </div>
              </div>
              <div className="text-sm text-gray-600">Active Competitions</div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {userSubmissionCount}
                </div>
              </div>
              <div className="text-sm text-gray-600">Your Submissions</div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {totalSubmissions}
                </div>
              </div>
              <div className="text-sm text-gray-600">Total Community Entries</div>
            </div>
          </div>
        )}

        {/* Active Competitions */}
        {activeCompetitions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Active Competitions
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeCompetitions.map((competition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
          </section>
        )}

        {/* Completed Competitions */}
        {completedCompetitions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-600" />
              Past Competitions
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {completedCompetitions.map((competition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!competitions || competitions.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <Trophy className="w-16 h-16 mx-auto text-gray-400" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                No competitions yet
              </h3>
              <p className="text-gray-600 mt-2">
                Check back soon for exciting competitions!
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}

type CompetitionStatus = "draft" | "active" | "closed" | "judging" | "completed" | string;

interface CompetitionSponsor {
  id: string;
  name: string;
}

interface CompetitionForCard {
  id: string;
  title: string;
  description: string;
  status: CompetitionStatus;
  end_date: string;
  cover_image_url?: string;
  banner_url?: string;
  reward_description?: string;
  sponsors?: CompetitionSponsor[];
  submission_count?: { count: number }[];
}

function CompetitionCard({ competition }: { competition: CompetitionForCard }) {
  const submissionCount = competition.submission_count?.[0]?.count || 0;
  const daysUntilEnd = Math.ceil(
    (new Date(competition.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isActive = competition.status === "active";
  const imageUrl = competition.cover_image_url || competition.banner_url;

  return (
    <Link
      href={`/app/competitions/${competition.id}`}
      className="block bg-white rounded-lg border hover:shadow-lg transition-shadow overflow-hidden group"
    >
      {/* Cover image */}
      {imageUrl ? (
        <div className="h-56 bg-gray-200 overflow-hidden">
          <img
            src={imageUrl}
            alt={competition.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      ) : (
        <div className="h-56 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Trophy className="w-16 h-16 text-white opacity-80" />
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* Title and Status */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {competition.title}
            </h3>
            {isActive && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex-shrink-0">
                Active
              </span>
            )}
            {competition.status === "completed" && (
              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full flex-shrink-0">
                Completed
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">
            {competition.description}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="w-4 h-4" />
            <span>{submissionCount} submissions</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            {isActive ? (
              <span>
                {daysUntilEnd > 0 ? `${daysUntilEnd} days left` : "Ending soon"}
              </span>
            ) : (
              <span>Ended</span>
            )}
          </div>
        </div>

        {/* Sponsors */}
        {competition.sponsors && competition.sponsors.length > 0 && (
          <div className="pt-3 border-t">
            <div className="text-xs text-gray-500 mb-2">Sponsored by</div>
            <div className="flex items-center gap-2 flex-wrap">
              {competition.sponsors.slice(0, 3).map((sponsor) => (
                <div
                  key={sponsor.id}
                  className="text-xs font-medium text-gray-700"
                >
                  {sponsor.name}
                </div>
              ))}
              {competition.sponsors.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{competition.sponsors.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rewards */}
        {competition.reward_description && (
          <div className="pt-3 border-t">
            <div className="flex items-start gap-2">
              <Award className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-700 line-clamp-2">
                {competition.reward_description}
              </div>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
