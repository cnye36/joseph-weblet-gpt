"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
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
                Choose Your Plan
              </h1>
              <p className="mt-6 text-xl text-neutral-700 max-w-3xl mx-auto leading-relaxed">
                Get started with Weblet GPT. Choose the plan that works best for
                you.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              {/* One-Day Pass */}
              <Card className="p-8 relative flex flex-col h-full">
                <div className="space-y-4 flex flex-col flex-1">
                  <div>
                    <h3 className="text-2xl font-bold">One-Day Pass</h3>
                    <p className="text-4xl font-bold mt-2">$5.00</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      One-time payment
                    </p>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span>24 hours of full access</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span>All premium features</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span>Perfect for trying out</span>
                    </li>
                  </ul>
                  <div className="mt-auto pt-4">
                    <Button asChild className="w-full">
                      <Link href="/signup">
                        Get Started <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Monthly Subscription */}
              <Card className="p-8 relative border-2 border-primary flex flex-col h-full">
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                  POPULAR
                </div>
                <div className="space-y-4 flex flex-col flex-1">
                  <div>
                    <h3 className="text-2xl font-bold">Premium Plan</h3>
                    <p className="text-4xl font-bold mt-2">$25.00</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      per month
                    </p>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span>Unlimited conversations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span>Priority support</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span>Advanced AI features</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span>No ads</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span>Cancel anytime</span>
                    </li>
                  </ul>
                  <div className="mt-auto pt-4">
                    <Button asChild className="w-full">
                      <Link href="/signup">
                        Subscribe Now <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
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
