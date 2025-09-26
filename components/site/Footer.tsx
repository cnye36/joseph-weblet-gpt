"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/app/chat")) return null;
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t bg-white/90">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-[image:var(--gradient)]" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block size-2.5 rounded-full bg-[image:var(--gradient)]" />
            <span className="text-base font-semibold tracking-tight">Weblet GPT</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Fully operational AI assistants for research, planning, and technical workflows.
          </p>
        </div>

        <div className="text-sm">
          <div className="font-medium text-neutral-900">Product</div>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/app" className="text-neutral-600 hover:text-neutral-900">
                App
              </Link>
            </li>
            <li>
              <Link href="/signup" className="text-neutral-600 hover:text-neutral-900">
                Create account
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-neutral-600 hover:text-neutral-900">
                Sign in
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <div className="font-medium text-neutral-900">Company</div>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="#" className="text-neutral-600 hover:text-neutral-900">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="#" className="text-neutral-600 hover:text-neutral-900">
                Terms
              </Link>
            </li>
            <li>
              <Link href="#" className="text-neutral-600 hover:text-neutral-900">
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-neutral-600">
          <span>© {year} Weblet GPT. All rights reserved.</span>
          <span className="hidden sm:block">Built with care.</span>
        </div>
      </div>
    </footer>
  );
}


