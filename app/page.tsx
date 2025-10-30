import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
// import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  const isAuthed = Boolean(data.user);

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
              highly technical professionals. Chat with optimized Weblets tailored
              for your specific domain expertise and complex workflows.
            </p>
            <div className="mt-8 flex items-center justify-center gap-x-3">
              {isAuthed ? (
                <Button asChild size="lg">
                  <Link href="/app">Open App</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/login">Sign in</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/signup">Create account</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          {/* Examples Section (actual GPTs users can use) */}
          <section className="mx-auto mt-20 max-w-6xl">
            <h2 className="text-center text-2xl font-bold tracking-wide text-neutral-900 mb-4">
              Featured Assistants You Can Use Now
            </h2>
            <p className="text-center text-lg text-neutral-600 max-w-2xl mx-auto">
              Practical, purpose-built Weblets tailored for common workflows.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <ExampleCard
                title="Poster Creator"
                description="Turn research articles into publication-ready posters with smart templates."
              />
              <ExampleCard
                title="Ganttrify Pro"
                description="Generate accurate, beautiful Gantt charts from CSV/Sheets or manual input."
              />
              <ExampleCard
                title="Microbial Assistant"
                description="Plan discriminative biochemical panels with QC to reach confident IDs."
              />
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
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="group relative rounded-xl p-[2px] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 transition-all duration-300 hover:scale-105">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"></div>
      <Card className="relative bg-white border-white/0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-xl">
        <CardHeader className="p-6">
          <CardTitle className="text-neutral-900 text-lg font-semibold">
            {title}
          </CardTitle>
          <CardDescription className="text-neutral-700 leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
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
