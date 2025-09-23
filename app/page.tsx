import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  const isAuthed = Boolean(data.user);

  return (
    <main className="min-h-svh">
      <div className="relative isolate px-6 pt-16 pb-12 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-4 size-12 rounded-xl bg-primary/15 flex items-center justify-center">
            <span className="font-bold text-primary text-xl">W</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Weblet GPT
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            A growing collection of purpose-built AI assistants for research,
            planning, and technical workflows.
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
        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            title="Poster Creator"
            description="Turn research articles into publication-ready posters with smart templates."
          />
          <Feature
            title="Ganttrify Pro"
            description="Generate beautiful, accurate Gantt charts from CSV/Sheets or manual input."
          />
          <Feature
            title="Microbial Assistant"
            description="Plan discriminative biochemical panels with QC to reach confident IDs."
          />
        </div>
      </div>
    </main>
  );
}

function Feature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border p-5">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{description}</div>
    </div>
  );
}
