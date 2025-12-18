import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ArrowLeft, Trophy, Calendar, Award, FileText, Target } from "lucide-react";
import { formatDistance } from "date-fns";
import CompetitionSubmissionForm from "@/components/competitions/CompetitionSubmissionForm";
import CompetitionLeaderboard from "@/components/competitions/CompetitionLeaderboard";
import CompetitionBaseline from "@/components/competitions/CompetitionBaseline";
import AppHeader from "@/components/header/AppHeader";

interface CompetitionSponsor {
  id: string;
  name: string;
  logo_url?: string | null;
  website_url?: string | null;
  description?: string | null;
  display_order: number;
}

interface UserSubmission {
  id: string;
  submission_number: number;
  title: string;
  submitted_at: string;
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch competition details
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
      <>
        <AppHeader />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Trophy className="w-16 h-16 mx-auto text-gray-400" />
            <h1 className="text-2xl font-bold">Competition not found</h1>
            <Link href="/app/competitions" className="text-blue-600 hover:underline">
              Back to competitions
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Non-admin visibility guard: only expose active or completed competitions
  if (!["active", "completed"].includes(competition.status)) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Trophy className="w-16 h-16 mx-auto text-gray-400" />
            <h1 className="text-2xl font-bold">Competition not found</h1>
            <Link href="/app/competitions" className="text-blue-600 hover:underline">
              Back to competitions
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Fetch bot names so we can show human-friendly labels instead of raw IDs
  const botIds = new Set<string>();
  if (competition.bot_id) {
    botIds.add(competition.bot_id);
  }
  if (
    competition.allowed_bot_ids &&
    Array.isArray(competition.allowed_bot_ids)
  ) {
    (competition.allowed_bot_ids as string[]).forEach((botId) => {
      if (typeof botId === "string" && botId.trim()) {
        botIds.add(botId);
      }
    });
  }

  let botNameMap: Record<string, string> = {};
  if (botIds.size > 0) {
    const { data: bots } = await supabaseAdmin
      .from("bots")
      .select("id, name")
      .in("id", Array.from(botIds));

    if (bots) {
      botNameMap = Object.fromEntries(
        (bots as { id: string; name: string }[]).map((b) => [b.id, b.name])
      );
    }
  }

  // Get user's submissions if authenticated
  let userSubmissions: UserSubmission[] = [];
  let canSubmit = false;
  if (user) {
    const { data } = await supabase
      .from("competition_submissions")
      .select("*")
      .eq("competition_id", id)
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false });

    userSubmissions = (data ?? []) as UserSubmission[];

    // Check if user can submit more
    const submissionCount = userSubmissions.length;
    canSubmit =
      competition.status === "active" &&
      new Date(competition.submission_deadline) > new Date() &&
      submissionCount < competition.max_submissions_per_user;
  }

  const daysUntilDeadline = Math.ceil(
    (new Date(competition.submission_deadline).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <Link
            href="/app/competitions"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Competitions
          </Link>

          {/* Banner */}
          {competition.banner_url && (
            <div className="w-full h-64 rounded-lg overflow-hidden">
              <img
                src={competition.banner_url}
                alt={competition.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {competition.title}
              </h1>
              <p className="text-lg text-gray-600">{competition.description}</p>
            </div>
            <div className="flex flex-col gap-2">
              {competition.status === "active" && (
                <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                  Active
                </span>
              )}
              {competition.status === "completed" && (
                <span className="px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full">
                  Completed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Key Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Calendar className="w-4 h-4" />
              <div className="text-xs font-medium">Deadline</div>
            </div>
            <div className="text-sm font-semibold">
              {new Date(competition.submission_deadline).toLocaleDateString()}
            </div>
            {competition.status === "active" && daysUntilDeadline > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {daysUntilDeadline} days left
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <FileText className="w-4 h-4" />
              <div className="text-xs font-medium">Bot/Weblet</div>
            </div>
            <div className="text-sm font-semibold">
              {competition.allowed_bot_ids && Array.isArray(competition.allowed_bot_ids) && competition.allowed_bot_ids.length > 0
                ? `${competition.allowed_bot_ids.length} bot${competition.allowed_bot_ids.length > 1 ? 's' : ''} available`
                : (botNameMap[competition.bot_id] || competition.bot_id)}
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Target className="w-4 h-4" />
              <div className="text-xs font-medium">Max Submissions</div>
            </div>
            <div className="text-sm font-semibold">
              {competition.max_submissions_per_user} per user
            </div>
            {user && userSubmissions && (
              <div className="text-xs text-gray-500 mt-1">
                You: {userSubmissions.length}/{competition.max_submissions_per_user}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Award className="w-4 h-4" />
              <div className="text-xs font-medium">Winners</div>
            </div>
            <div className="text-sm font-semibold">
              Top {competition.top_winners_count}
            </div>
          </div>
        </div>

        {/* Use Competition Bot(s) */}
        {competition.status === "active" && (
          <section
            id="use-competition-bot"
            className="bg-white rounded-lg border p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold">Start a Competition Chat</h2>
                <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                  Open a chat with the required bot{competition.allowed_bot_ids &&
                  Array.isArray(competition.allowed_bot_ids) &&
                  competition.allowed_bot_ids.length > 1
                    ? "s"
                    : ""}{" "}
                  directly from this competition. Any chat started this way will
                  be available to submit below.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {competition.allowed_bot_ids &&
              Array.isArray(competition.allowed_bot_ids) &&
              competition.allowed_bot_ids.length > 0
                ? competition.allowed_bot_ids.map((botIdOption: string) => (
                    <Link
                      key={botIdOption}
                      href={`/app/chat?bot=${encodeURIComponent(
                        botIdOption
                      )}&competitionId=${encodeURIComponent(id)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      Use {botNameMap[botIdOption] || botIdOption}
                    </Link>
                  ))
                : (
                    <Link
                      href={`/app/chat?bot=${encodeURIComponent(
                        competition.bot_id
                      )}&competitionId=${encodeURIComponent(id)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      Open competition chat
                    </Link>
                  )}
            </div>
          </section>
        )}

        {/* Sponsors */}
        {competition.sponsors && competition.sponsors.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Sponsored By</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {(competition.sponsors as CompetitionSponsor[])
                .sort((a, b) => a.display_order - b.display_order)
                .map((sponsor) => (
                  <div key={sponsor.id} className="text-center space-y-2">
                    {sponsor.logo_url && (
                      <div className="h-16 flex items-center justify-center">
                        <img
                          src={sponsor.logo_url}
                          alt={sponsor.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    )}
                    <div className="text-sm font-medium">{sponsor.name}</div>
                    {sponsor.website_url && (
                      <a
                        href={sponsor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Visit website
                      </a>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Rewards */}
        {competition.reward_description && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 p-6">
            <div className="flex items-start gap-3">
              <Award className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-amber-900 mb-2">
                  Rewards
                </h2>
                <div className="text-gray-700 whitespace-pre-line">
                  {competition.reward_description}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rules & Instructions */}
        <div className="grid md:grid-cols-2 gap-6">
          {competition.rules && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-3">Rules</h2>
              <div className="text-sm text-gray-700 whitespace-pre-line">
                {competition.rules}
              </div>
            </div>
          )}

          {competition.instructions && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-3">Instructions</h2>
              <div className="text-sm text-gray-700 whitespace-pre-line">
                {competition.instructions}
              </div>
            </div>
          )}
        </div>

        {/* Baseline Evaluation */}
        {(competition.baseline_title ||
          competition.baseline_description ||
          competition.baseline_prompts ||
          competition.baseline_evaluation_notes) && (
          <CompetitionBaseline competition={competition} />
        )}

        {/* Submission Form */}
        {user && canSubmit && (
          <div id="submit">
            <CompetitionSubmissionForm
              competitionId={id}
              botId={competition.bot_id}
              allowedBotIds={competition.allowed_bot_ids || []}
              maxSubmissions={competition.max_submissions_per_user}
              currentSubmissions={userSubmissions?.length || 0}
              botNamesById={botNameMap}
            />
          </div>
        )}

        {user && !canSubmit && competition.status === "active" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">
              {userSubmissions && userSubmissions.length >= competition.max_submissions_per_user
                ? `You have reached the maximum of ${competition.max_submissions_per_user} submissions.`
                : "Submissions are closed or deadline has passed."}
            </p>
          </div>
        )}

        {!user && competition.status === "active" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-800">
              <Link href="/login" className="font-semibold hover:underline">
                Log in
              </Link>{" "}
              to participate in this competition
            </p>
          </div>
        )}

        {/* Leaderboard (only show for completed competitions) */}
        {competition.status === "completed" && (
          <CompetitionLeaderboard competitionId={id} />
        )}

        {/* User's Submissions */}
        {user && userSubmissions.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Your Submissions</h2>
            <div className="space-y-3">
            {userSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        #{submission.submission_number} - {submission.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Submitted{" "}
                        {formatDistance(
                          new Date(submission.submitted_at),
                          new Date(),
                          { addSuffix: true }
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
