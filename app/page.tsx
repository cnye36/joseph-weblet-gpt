import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { bots as staticBots } from "@/lib/bots";
import { Award, Trophy, Users } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();

  // Fetch all bots from database
  const { data: dbBots, error: botsError } = await supabase
    .from("bots")
    .select("id, name, description, avatar_url")
    .order("created_at", { ascending: false });

  // Log error if fetching bots fails (non-blocking, will use static bots as fallback)
  if (botsError) {
    console.error("Error fetching bots:", botsError);
  }

  // Use database bots if available, otherwise fallback to static bots
  const allBots =
    dbBots && dbBots.length > 0
      ? dbBots.map((b) => ({
          id: b.id,
          name: b.name,
          description: b.description || "",
          avatar_url: b.avatar_url,
        }))
      : Object.values(staticBots).map((b) => ({
          id: b.id,
          name: b.name,
          description: "",
          avatar_url: null,
        }));

  // Select 9 GPTs to feature (or all if less than 9)
  const featuredGPTs = allBots.slice(0, 9);

  // Competition metrics (non-blocking best-effort for authority)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let activeCompetitions = 0;
  let completedCompetitions = 0;
  let totalSubmissions = 0;

  try {
    const [{ count: activeCount }, { count: completedCount }] =
      await Promise.all([
        supabaseAdmin
          .from("competitions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabaseAdmin
          .from("competitions")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed"),
      ]);

    activeCompetitions = activeCount || 0;
    completedCompetitions = completedCount || 0;
  } catch (error) {
    console.error("Error fetching competition counts:", error);
  }

  try {
    const { count: submissionsCount, error: submissionsError } =
      await supabaseAdmin
        .from("competition_submissions")
        .select("*", { count: "exact", head: true });

    if (submissionsError) {
      console.error("Error counting competition submissions:", submissionsError);
    } else {
      totalSubmissions = submissionsCount || 0;
    }
  } catch (error) {
    console.error("Error fetching competition submissions:", error);
  }

  return (
    <>
      <Header />
      <main className="min-h-svh bg-white">
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-6 pt-16 pb-24 sm:px-8 lg:pt-24 lg:pb-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="text-center lg:text-left">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl bg-clip-text text-transparent bg-[image:var(--gradient)]">
                  Weblet GPT for scientific and technical teams
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-neutral-700 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Work with specialized Weblets that support careful analysis,
                  documentation, and planning. When you need to compare approaches,
                  you can opt into structured competitions with transparent judging
                  and prizes.
                </p>
                <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                  <Button asChild size="lg">
                    <Link href="/signup">Start using Weblets</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/competitions">Explore competitions</Link>
                  </Button>
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                <Image
                  src="/scientist-hero-image.png"
                  alt="Scientist reviewing AI-assisted results on screen"
                  width={960}
                  height={720}
                  priority
                  className="w-full max-w-lg lg:max-w-xl object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* High‑level metrics */}
        <section className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <StatCard
              icon={Trophy}
              label="Active competitions"
              value={activeCompetitions}
            />
            <StatCard
              icon={Award}
              label="Completed evaluations"
              value={completedCompetitions}
            />
            <StatCard
              icon={Users}
              label="Submissions evaluated"
              value={totalSubmissions}
            />
          </div>
        </section>

        {/* Competitions overview (brief) */}
        <section className="mx-auto max-w-7xl px-6 mt-20 sm:px-8">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-8 py-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
                  Competitions for rigorous, comparable results
                </h2>
                <p className="mt-4 text-base text-neutral-700 leading-relaxed">
                  Weblet GPT periodically hosts focused competitions where
                  participants submit work produced with specific Weblets. Entries
                  are evaluated under clear rules and criteria, with prizes and
                  recognition for top submissions.
                </p>
                <p className="mt-4 text-sm text-neutral-600">
                  Currently running{" "}
                  <span className="font-semibold text-neutral-900">
                    {activeCompetitions.toLocaleString()}
                  </span>{" "}
                  active competition
                  {activeCompetitions === 1 ? "" : "s"} and{" "}
                  <span className="font-semibold text-neutral-900">
                    {totalSubmissions.toLocaleString()}
                  </span>{" "}
                  total submissions evaluated to date.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button asChild variant="outline" size="lg">
                  <Link href="/competitions">
                    Learn more about competitions
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Core platform capabilities */}
        <section className="mx-auto max-w-7xl px-6 mt-24 sm:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
              A workspace for serious technical conversations
            </h2>
            <p className="mt-6 text-lg text-neutral-700 leading-relaxed">
              Outside of competitions, Weblet GPT provides stable, specialized
              assistants for day‑to‑day scientific work: from drafting methods
              sections to exploring experimental designs.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white text-sm font-semibold">
                    1
                  </span>
                  Domain-aware Weblets
                </CardTitle>
                <CardDescription className="mt-3 text-base text-neutral-700">
                  Choose assistants tailored for research, engineering, and
                  analytical work, with prompts designed for technical depth
                  rather than generic chat.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white text-sm font-semibold">
                    2
                  </span>
                  Reusable workflows
                </CardTitle>
                <CardDescription className="mt-3 text-base text-neutral-700">
                  Capture successful prompts and flows from competitions or
                  routine work, then reuse them with your team as standard
                  operating procedures.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white text-sm font-semibold">
                    3
                  </span>
                  Built for collaboration
                </CardTitle>
                <CardDescription className="mt-3 text-base text-neutral-700">
                  Use a shared environment where experiments, drafts, and
                  competition entries can be discussed and improved together.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Examples Section (actual GPTs users can use) */}
        <section className="mx-auto max-w-7xl px-6 mt-24 sm:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
              Featured assistants you can use today
            </h2>
            <p className="mt-6 text-lg text-neutral-700 leading-relaxed">
              Practical, purpose-built Weblets for literature review, analysis,
              reporting, and more.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredGPTs.map((gpt) => (
              <ExampleCard
                key={gpt.id}
                title={gpt.name}
                description={
                  gpt.description ||
                  `Specialized assistant for ${gpt.name.toLowerCase()}`
                }
                avatarUrl={gpt.avatar_url}
              />
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="mx-auto max-w-7xl px-6 mt-24 sm:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
              Trusted by scientists and technical teams
            </h2>
            <p className="mt-6 text-lg text-neutral-700 leading-relaxed">
              Feedback from early research users who rely on Weblet GPT for
              careful, reproducible work rather than one‑off demos.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <TestimonialCard
              name="Principal Investigator, Computational Biology"
              quote="The competition format forces our group to be explicit about evaluation criteria and baseline performance. It has already improved the quality of our prompt designs."
            />
            <TestimonialCard
              name="Senior Data Scientist, Healthcare"
              quote="We use Weblets for routine analysis, then occasionally run internal competitions when we introduce a new workflow. The structured feedback is more useful than a simple leaderboard."
            />
            <TestimonialCard
              name="Research Engineer, ML Lab"
              quote="What stands out is the focus on transparency—clear rules, visible scoring dimensions, and written evaluator notes. It feels like a tool built for serious experiments."
            />
          </div>
        </section>

        {/* Supported Models as pills */}
        <section className="mx-auto max-w-7xl px-6 mt-24 pb-24 sm:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
              Supported Model Providers
            </h2>
            <p className="mt-6 text-lg text-neutral-700 leading-relaxed">
              Use a wide range of models depending on quality, latency, and cost.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {[
              "GPT-4o",
              "GPT-4o mini",
              "o3-mini",
              "Claude 3.5 Sonnet",
              "Claude 3 Haiku",
              "Gemini 1.5 Pro",
              "Gemini 1.5 Flash",
              "Mistral Large",
              "Mixtral 8x7B",
              "Llama 3.1 70B",
              "Phi-3 Medium",
              "Ollama (local)",
            ].map((m) => (
              <div
                key={m}
                className="rounded-full p-[1px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 transition-all duration-300 hover:scale-105"
              >
                <span className="block rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:text-neutral-900 transition-colors">
                  {m}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ExampleCard({
  title,
  description,
  avatarUrl,
}: {
  title: string;
  description: string;
  avatarUrl?: string | null;
}) {
  return (
    <div className="group relative rounded-xl p-[2px] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 transition-all duration-300 hover:scale-105 h-full">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"></div>
      <div className="relative bg-white rounded-[10px] shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
        <div className="p-4 flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`${title} avatar`}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {title.charAt(0)}
              </div>
            )}
            <CardTitle className="text-neutral-900 text-base font-semibold">
              {title}
            </CardTitle>
          </div>
          <CardDescription className="text-neutral-700 text-sm leading-relaxed line-clamp-2">
            {description}
          </CardDescription>
        </div>
      </div>
    </div>
  );
}

// (Unused) Detailed model card retained for future iterations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ModelCardDetailed({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl p-[1px] bg-[image:var(--gradient)]/20">
      <Card className="bg-white border-white/0 shadow-sm hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-neutral-900">
            <span className="inline-block size-2.5 rounded-full bg-[image:var(--gradient)]" />
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="leading-relaxed text-neutral-700">
              {description}
            </CardDescription>
          ) : null}
        </CardHeader>
        {description ? (
          <CardContent>
            <div className="text-xs text-neutral-600">
              Example prompts and usage tips coming soon.
            </div>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}

// InfoCard removed as it's no longer used

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number;
}) {
  return (
    <Card className="border-neutral-200">
      <CardHeader className="p-6">
        <div className="flex items-center gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white flex-shrink-0">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold text-neutral-900">
              {value.toLocaleString()}
            </p>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function TestimonialCard({ name, quote }: { name: string; quote: string }) {
  return (
    <Card className="border-neutral-200 h-full flex flex-col">
      <CardContent className="p-6 flex-1 flex flex-col">
        <p className="text-base text-neutral-800 leading-relaxed">"{quote}"</p>
        <div className="mt-6 text-sm font-semibold text-neutral-900">
          {name}
        </div>
      </CardContent>
    </Card>
  );
}
