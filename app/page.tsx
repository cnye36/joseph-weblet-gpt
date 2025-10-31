import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { bots as staticBots } from "@/lib/bots";

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

  return (
    <>
      <Header />
      <main className="min-h-svh bg-white">
        <div className="relative isolate px-6 pt-10 pb-12 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-[image:var(--gradient)]">
              Welcome to Weblet GPT
            </h1>
            <p className="mt-6 text-xl text-neutral-700 max-w-3xl mx-auto leading-relaxed">
              A cutting-edge platform designed for scientists, researchers, and
              highly technical professionals. Chat with optimized Weblets
              tailored for your specific domain expertise and complex workflows.
            </p>
          </div>
          {/* Examples Section (actual GPTs users can use) */}
          <section className="mx-auto mt-20 max-w-6xl">
            <h2 className="text-center text-2xl font-bold tracking-wide text-neutral-900 mb-4">
              Featured Assistants You Can Use Now
            </h2>
            <p className="text-center text-lg text-neutral-600 max-w-2xl mx-auto">
              Practical, purpose-built Weblets tailored for common workflows.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

          {/* Supported Models as pills */}
          <section className="mx-auto mt-20 max-w-6xl">
            <h2 className="text-center text-2xl font-bold tracking-wide text-neutral-900 mb-4">
              Supported Model Providers
            </h2>
            <p className="text-center text-lg text-neutral-600 max-w-2xl mx-auto">
              Use a wide range of models depending on quality, latency, and
              cost.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
        </div>
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
