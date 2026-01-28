import { createClient as createAdminClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { Award, Calendar, Trophy, Users, BarChart3 } from "lucide-react";

type CompetitionStatus =
  | "draft"
  | "active"
  | "closed"
  | "judging"
  | "completed"
  | string;

interface CompetitionSponsor {
  id: string;
  name: string;
}

interface CompetitionForCard {
  id: string;
  title: string;
  description: string;
  status: CompetitionStatus;
  start_date: string | null;
  end_date: string | null;
  submission_deadline: string | null;
  reward_description?: string | null;
  sponsors?: CompetitionSponsor[];
  submission_count?: { count: number }[];
}

export default async function PublicCompetitionsPage() {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let competitions: CompetitionForCard[] = [];
  let activeCompetitions: CompetitionForCard[] = [];
  let completedCompetitions: CompetitionForCard[] = [];
  let totalSubmissions = 0;

  try {
    const { data } = await supabaseAdmin
      .from("competitions")
      .select(
        `
        id,
        title,
        description,
        status,
        start_date,
        end_date,
        submission_deadline,
        reward_description,
        sponsors:competition_sponsors(id, name),
        submission_count:competition_submissions(count)
      `
      )
      .in("status", ["active", "completed"])
      .order("start_date", { ascending: false });

    competitions = (data as CompetitionForCard[]) ?? [];
  } catch (error) {
    console.error("Error fetching competitions for public page:", error);
  }

  activeCompetitions = competitions.filter((c) => c.status === "active");
  completedCompetitions = competitions.filter((c) => c.status === "completed");

  totalSubmissions = competitions.reduce(
    (sum, comp) => sum + (comp.submission_count?.[0]?.count || 0),
    0
  );

  const activeCount = activeCompetitions.length;
  const completedCount = completedCompetitions.length;

  return (
    <>
      <Header />
      <main className="min-h-svh bg-white">
        <div className="px-6 pt-16 pb-16 lg:px-8">
          {/* Hero */}
          <section className="mx-auto max-w-5xl">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900">
              Competitions & evaluations
            </h1>
            <p className="mt-4 text-lg text-neutral-700 max-w-3xl">
              Weblet GPT competitions provide a structured way to compare
              approaches, prompts, and outputs. Each competition has clearly
              defined rules, criteria, and timelines, with recognition and
              sometimes cash prizes for the strongest submissions.
            </p>
          </section>

          {/* Metrics */}
          <section className="mx-auto mt-10 max-w-5xl">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Active competitions"
                value={activeCount}
                icon={Trophy}
              />
              <StatCard
                label="Completed competitions"
                value={completedCount}
                icon={Award}
              />
              <StatCard
                label="Total submissions evaluated"
                value={totalSubmissions}
                icon={Users}
              />
            </div>
          </section>

          {/* How competitions work */}
          <section className="mx-auto mt-16 max-w-5xl">
            <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] items-start">
              <div>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
                  Structured, transparent evaluation
                </h2>
                <p className="mt-4 text-sm sm:text-base text-neutral-700">
                  Competitions are designed for scientists and technical teams
                  who want more than a leaderboard. Submissions are judged using
                  written criteria, often along multiple dimensions such as
                  product quality and prompt design.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-neutral-700">
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-neutral-900" />
                    <span>
                      Organizers publish scope, rules, and evaluation criteria
                      before submissions open.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-neutral-900" />
                    <span>
                      Participants work in dedicated competition chats with the
                      specified Weblet configuration.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-neutral-900" />
                    <span>
                      Submissions include a concise title and optional
                      methodology notes describing how the result was produced.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-neutral-900" />
                    <span>
                      After judging, a leaderboard summarizes results and
                      evaluator feedback highlights strengths and areas for
                      improvement.
                    </span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border bg-neutral-50 p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Typical competition timeline
                </h3>
                <ol className="mt-4 space-y-3 text-sm text-neutral-700">
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                      1
                    </span>
                    <div>
                      <p className="font-medium">Announcement</p>
                      <p className="mt-1">
                        Organizers publish the problem statement, baseline, and
                        evaluation criteria.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                      2
                    </span>
                    <div>
                      <p className="font-medium">Experimentation</p>
                      <p className="mt-1">
                        Participants iterate in competition chats with the
                        relevant Weblets.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                      3
                    </span>
                    <div>
                      <p className="font-medium">Submission</p>
                      <p className="mt-1">
                        Final entries are submitted before the deadline with
                        optional methodology notes.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                      4
                    </span>
                    <div>
                      <p className="font-medium">Judging & results</p>
                      <p className="mt-1">
                        Evaluators score submissions and publish rankings,
                        feedback, and any associated prizes.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </section>

          {/* Active competitions */}
          <section className="mx-auto mt-20 max-w-6xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Active competitions
              </h2>
              <p className="text-sm text-neutral-600">
                Sign in to participate and submit entries.
              </p>
            </div>
            {activeCompetitions.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed bg-neutral-50 p-6 text-sm text-neutral-600">
                There are no active competitions at the moment. New calls for
                submissions will appear here when they open.
              </div>
            ) : (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {activeCompetitions.map((competition) => (
                  <CompetitionCard key={competition.id} competition={competition} />
                ))}
              </div>
            )}
          </section>

          {/* Completed competitions */}
          <section className="mx-auto mt-20 max-w-6xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Recently completed
              </h2>
              <p className="text-sm text-neutral-600">
                Explore past competitions and their evaluation structure.
              </p>
            </div>
            {completedCompetitions.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed bg-neutral-50 p-6 text-sm text-neutral-600">
                Completed competitions will appear here once results are
                published.
              </div>
            ) : (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {completedCompetitions.slice(0, 4).map((competition) => (
                  <CompetitionCard key={competition.id} competition={competition} />
                ))}
              </div>
            )}
          </section>

          {/* Call to action */}
          <section className="mx-auto mt-20 max-w-5xl">
            <Card className="border-neutral-200 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="text-2xl">
                  Interested in running a competition?
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Weblet GPT can support internal challenges, method
                  comparisons, or open calls for submissions. Contact us to
                  discuss a format that fits your group.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-700">
                  For now, the best way to get started is to sign up, explore
                  existing Weblets, and reach out through your usual channel if
                  you&apos;re interested in organizing a structured evaluation.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                  >
                    Sign up to participate
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                  >
                    Log in
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function CompetitionCard({ competition }: { competition: CompetitionForCard }) {
  const isActive = competition.status === "active";
  const submissions =
    competition.submission_count && competition.submission_count[0]
      ? competition.submission_count[0].count
      : 0;

  const deadline = competition.submission_deadline
    ? new Date(competition.submission_deadline)
    : competition.end_date
    ? new Date(competition.end_date)
    : null;

  return (
    <Card className="border-neutral-200 h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{competition.title}</CardTitle>
            <CardDescription className="mt-2 line-clamp-3 text-sm text-neutral-700">
              {competition.description}
            </CardDescription>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              isActive
                ? "bg-emerald-50 text-emerald-800"
                : "bg-neutral-100 text-neutral-800"
            }`}
          >
            {isActive ? "Active" : "Completed"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 text-xs text-neutral-600">
          {deadline && (
            <div className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {isActive ? "Deadline" : "Ended"}{" "}
                {deadline.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          <div className="inline-flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>
              {submissions.toLocaleString()} submission
              {submissions === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {competition.reward_description && (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span className="font-medium">Rewards: </span>
            <span className="line-clamp-2">
              {competition.reward_description}
            </span>
          </div>
        )}

        {competition.sponsors && competition.sponsors.length > 0 && (
          <div className="text-xs text-neutral-600">
            <span className="font-medium text-neutral-800">Sponsors: </span>
            {competition.sponsors
              .map((sponsor) => sponsor.name)
              .slice(0, 3)
              .join(", ")}
            {competition.sponsors.length > 3 && " …"}
          </div>
        )}

        <div className="mt-2">
          <Link
            href={`/app/competitions/${competition.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-900 hover:underline"
          >
            View full details
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <Card className="border-neutral-200">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold text-neutral-900">
            {value.toLocaleString()}
          </p>
        </div>
      </CardHeader>
    </Card>
  );
}



