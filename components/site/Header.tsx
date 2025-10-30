import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isAuthed = Boolean(data.user);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 relative"
        aria-label="Global"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/logo.png"
              alt="Weblet GPT Logo"
              width={36}
              height={36}
              className="rounded-full shadow"
              priority
            />
            <span className="text-lg sm:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-[image:var(--gradient)]">
              Weblet GPT
            </span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-6 absolute left-1/2 transform -translate-x-1/2">
          <Link
            href="/features"
            className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {!isAuthed && (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/login" aria-label="Sign in">
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/pricing" aria-label="Sign up">
                  Get Started
                </Link>
              </Button>
            </>
          )}
          {isAuthed && (
            <Button asChild size="sm">
              <Link href="/app" aria-label="Open app">
                Open App
              </Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}


