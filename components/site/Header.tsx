import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isAuthed = Boolean(data.user);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-white/10">
      <nav
        className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16"
        aria-label="Global"
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Weblet GPT Logo"
              width={32}
              height={32}
              className="rounded-full shadow"
              priority
            />
            <span className="text-base sm:text-lg font-semibold tracking-tight bg-clip-text text-transparent bg-[image:var(--gradient)]">
              Weblet GPT
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {!isAuthed && (
            <>
              <Button asChild size="sm">
                <Link href="/login" aria-label="Sign in">Sign in</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/signup" aria-label="Create account">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}


