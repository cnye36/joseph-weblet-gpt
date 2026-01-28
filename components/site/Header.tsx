import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default async function Header() {
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
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-[image:var(--gradient)]">
                Weblet GPT
              </span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 border border-emerald-200">
                Now free
              </span>
            </div>
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
            href="/competitions"
            className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            Competitions
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            Free access
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="ghost">
            <Link href="/login" aria-label="Sign in">
              Sign in
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup" aria-label="Sign up">
              Get Started
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}

