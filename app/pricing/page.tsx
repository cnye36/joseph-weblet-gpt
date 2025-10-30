"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: unknown) => {
        render: (selector: string) => void;
      };
    };
  }
}

function PricingContent() {
  const [showPayPalButtons, setShowPayPalButtons] = useState(false);
  const [showOneDayButtons, setShowOneDayButtons] = useState(false);
  const [paypalPlanId, setPaypalPlanId] = useState<string | null>(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalOrderReady, setPaypalOrderReady] = useState(false);
  const [notice, setNotice] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });
  const [selectedPlan, setSelectedPlan] = useState<"day" | "monthly" | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const expired = searchParams.get("expired") === "true";
  const required = searchParams.get("required") === "true";

  const loadPayPalPlanId = useCallback(async () => {
    const envPlanId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID;
    if (envPlanId) {
      setPaypalPlanId(envPlanId);
      return;
    }
    console.log("No PayPal plan ID found in environment variables");
  }, []);

  function unloadPayPalSDK() {
    const existing = document.querySelector(
      'script[src*="www.paypal.com/sdk/js"]'
    ) as HTMLScriptElement | null;
    if (existing) existing.remove();
    if ("paypal" in window) {
      delete (window as unknown as { paypal?: unknown }).paypal;
    }
    setPaypalReady(false);
    setPaypalOrderReady(false);
  }

  function loadPayPalSDK(options: {
    intent: "subscription" | "capture";
    vault?: boolean;
  }) {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) {
      console.error("Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID");
      return;
    }

    unloadPayPalSDK();

    const params = new URLSearchParams();
    params.set("client-id", clientId);
    params.set("components", "buttons");
    params.set("intent", options.intent);
    if (options.vault) params.set("vault", "true");

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.async = true;
    script.onload = () => {
      if (options.intent === "subscription") {
        setPaypalReady(true);
        if (showPayPalButtons) {
          renderPayPalButtons();
        }
      } else {
        setPaypalOrderReady(true);
        if (showOneDayButtons) {
          renderOneDayButtons();
        }
      }
    };
    script.onerror = () => {
      console.error("Failed to load PayPal SDK script");
    };
    document.body.appendChild(script);
  }

  const renderPayPalButtons = useCallback(() => {
    const paypalContainer = document.getElementById("paypal-button-container");
    if (!paypalContainer || !window.paypal) return;

    paypalContainer.innerHTML = "";

    window.paypal
      .Buttons({
        style: {
          shape: "rect",
          color: "gold",
          layout: "vertical",
          label: "subscribe",
        },
        createSubscription: function (
          data: Record<string, unknown>,
          actions: Record<string, unknown>
        ) {
          const planId = paypalPlanId || process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID;
          if (!planId) {
            throw new Error(
              "PayPal plan ID not configured. Please set up your PayPal subscription first."
            );
          }
          return (
            (actions as Record<string, unknown>).subscription as {
              create: (config: Record<string, unknown>) => Promise<unknown>;
            }
          ).create({
            plan_id: planId,
          });
        },
        onApprove: async function (data: Record<string, unknown>) {
          console.log("Subscription approved:", data);
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
              // User needs to sign up first
              setNotice({
                open: true,
                title: "Account required",
                message: "Please sign up or sign in to complete your subscription.",
              });
              setTimeout(() => {
                router.push("/signup");
              }, 2000);
              return;
            }

            const { error } = await supabase.from("subscriptions").insert({
              user_id: user.id,
              subscription_id: data.subscriptionID,
              plan_name: "Premium Plan",
              status: "active",
              amount: 25.0,
              next_billing_date: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
            });

            if (error) throw error;

            setNotice({
              open: true,
              title: "Subscription successful",
              message: "Your Premium Plan is now active. Redirecting to app...",
            });
            setTimeout(() => {
              router.push("/app");
            }, 2000);
          } catch (error) {
            console.error("Error saving subscription:", error);
            setNotice({
              open: true,
              title: "Subscription saved with issues",
              message:
                "Subscription was created but there was a problem saving it.",
            });
          }
        },
        onError: function (err: Error) {
          console.error("PayPal error:", err);
          setNotice({
            open: true,
            title: "PayPal error",
            message: "An error occurred with PayPal. Please try again.",
          });
        },
      })
      .render("#paypal-button-container");
  }, [paypalPlanId, supabase, router]);

  const renderOneDayButtons = useCallback(() => {
    const container = document.getElementById(
      "paypal-one-day-button-container"
    );
    if (!container || !window.paypal) return;

    container.innerHTML = "";

    window.paypal
      .Buttons({
        style: {
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "pay",
        },
        createOrder: function (
          _data: Record<string, unknown>,
          actions: Record<string, unknown>
        ) {
          return (
            actions as unknown as {
              order: { create: (config: unknown) => Promise<string> };
            }
          ).order.create({
            intent: "CAPTURE",
            purchase_units: [
              {
                amount: { value: "5.00", currency_code: "USD" },
                description: "One-Day Pass",
              },
            ],
          });
        },
        onApprove: async function (
          _data: Record<string, unknown>,
          actions: Record<string, unknown>
        ) {
          try {
            const details = await (
              actions as unknown as {
                order: { capture: () => Promise<unknown> };
              }
            ).order.capture();
            console.log("Order captured:", details);

            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
              // User needs to sign up first
              setNotice({
                open: true,
                title: "Account required",
                message: "Please sign up or sign in to complete your purchase.",
              });
              setTimeout(() => {
                router.push("/signup");
              }, 2000);
              return;
            }

            // Save one-day pass to subscriptions table
            const orderDetails = details as Record<string, unknown>;
            const orderId = orderDetails.id as string;

            const { error } = await supabase.from("subscriptions").insert({
              user_id: user.id,
              subscription_id: `day-pass-${orderId}`,
              plan_name: "One-Day Pass",
              status: "active",
              amount: 5.0,
              next_billing_date: new Date(
                Date.now() + 24 * 60 * 60 * 1000
              ).toISOString(),
            });

            if (error) throw error;

            setNotice({
              open: true,
              title: "Payment successful",
              message: "Your one-day pass has been activated. Redirecting to app...",
            });
            setTimeout(() => {
              router.push("/app");
            }, 2000);
          } catch (err) {
            console.error("Error capturing order:", err);
            setNotice({
              open: true,
              title: "Processing issue",
              message:
                "Payment captured but an error occurred processing your purchase.",
            });
          }
        },
        onError: function (err: Error) {
          console.error("PayPal order error:", err);
          setNotice({
            open: true,
            title: "PayPal error",
            message: "An error occurred with PayPal. Please try again.",
          });
        },
      })
      .render("#paypal-one-day-button-container");
  }, [supabase, router]);

  useEffect(() => {
    loadPayPalPlanId();
  }, [loadPayPalPlanId]);

  useEffect(() => {
    if (showPayPalButtons && window.paypal) {
      renderPayPalButtons();
    }
  }, [showPayPalButtons, paypalReady, renderPayPalButtons]);

  useEffect(() => {
    if (showOneDayButtons && window.paypal) {
      renderOneDayButtons();
    }
  }, [showOneDayButtons, paypalOrderReady, renderOneDayButtons]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm">
        <nav
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 relative"
          aria-label="Global"
        >
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
              <Link href="/login" aria-label="Sign in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/pricing" aria-label="Get started">Get Started</Link>
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
                Get started with Weblet GPT. Choose the plan that works best for you.
              </p>
              {(expired || required) && (
                <div className="mt-6 max-w-2xl mx-auto">
                  <Card className="p-4 bg-yellow-50 border-yellow-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-yellow-800">
                          {expired
                            ? "Your day pass has expired"
                            : "Active subscription required"}
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          {expired
                            ? "Please select a plan below to continue using Weblet GPT."
                            : "You need an active subscription to access the app. Please select a plan below."}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>

          {notice.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setNotice({ open: false, title: "", message: "" })}
              />
              <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h4 className="text-lg font-semibold mb-2">{notice.title}</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {notice.message}
                </p>
                <div className="flex justify-end">
                  <Button
                    onClick={() =>
                      setNotice({ open: false, title: "", message: "" })
                    }
                  >
                    OK
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            {/* One-Day Pass */}
            <Card className="p-8 relative">
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold">One-Day Pass</h3>
                  <p className="text-4xl font-bold mt-2">$5.00</p>
                  <p className="text-sm text-muted-foreground mt-1">One-time payment</p>
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
                {selectedPlan === "day" && showOneDayButtons ? (
                  <div className="space-y-4">
                    <div id="paypal-one-day-button-container"></div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setShowOneDayButtons(false);
                        setSelectedPlan(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedPlan("day");
                      setShowPayPalButtons(false);
                      setShowOneDayButtons(true);
                      loadPayPalSDK({ intent: "capture" });
                    }}
                  >
                    Get Started <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>

            {/* Monthly Subscription */}
            <Card className="p-8 relative border-2 border-primary">
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                POPULAR
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold">Premium Plan</h3>
                  <p className="text-4xl font-bold mt-2">$25.00</p>
                  <p className="text-sm text-muted-foreground mt-1">per month</p>
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
                {selectedPlan === "monthly" && showPayPalButtons ? (
                  <div className="space-y-4">
                    <div id="paypal-button-container"></div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setShowPayPalButtons(false);
                        setSelectedPlan(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedPlan("monthly");
                      setShowOneDayButtons(false);
                      setShowPayPalButtons(true);
                      loadPayPalSDK({ intent: "subscription", vault: true });
                    }}
                  >
                    Subscribe Now <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
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
    </>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-svh bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}

