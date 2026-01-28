"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/site/Footer";

function PricingContent() {
  return (
    <>
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
              className="text-sm font-medium text-neutral-900 font-semibold"
            >
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="ghost">
              <Link href="/login" aria-label="Sign in">
                Sign in
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup" aria-label="Get started">
                Get Started
              </Link>
            </Button>
          </div>
        </nav>
      </header>
      <div className="min-h-svh bg-white">
        <div className="relative isolate px-6 pt-10 pb-12 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-[image:var(--gradient)]">
                Weblet GPT is currently free
              </h1>
              <p className="mt-6 text-xl text-neutral-700 max-w-3xl mx-auto leading-relaxed">
                For the foreseeable future, all features of Weblet GPT are
                available at no cost. You just need an account to start using
                everything.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-4 text-center">
                  No payment required
                </h2>
                <p className="text-sm sm:text-base text-neutral-700 text-center mb-6">
                  We&apos;ve turned off billing and subscriptions for now. You
                  can sign up and use all previously premium features without
                  entering any payment details.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button asChild>
                    <Link href="/signup">Create a free account</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/login">Sign in</Link>
                  </Button>
                </div>
              </Card>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh bg-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
