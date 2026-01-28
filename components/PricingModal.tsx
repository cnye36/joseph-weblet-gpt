"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { IS_FREE_MODE } from "@/lib/utils";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: unknown) => {
        render: (selector: string) => void;
      };
    };
  }
}

interface PricingModalProps {
  open: boolean;
  onClose?: () => void;
  required?: boolean;
}

export default function PricingModal({
  open,
  onClose,
  required = false,
}: PricingModalProps) {
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [paypalPlanId, setPaypalPlanId] = useState<string | null>(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalOrderReady, setPaypalOrderReady] = useState(false);
  const [showPayPalButtons, setShowPayPalButtons] = useState(false);
  const [showOneDayButtons, setShowOneDayButtons] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"day" | "monthly" | null>(
    null,
  );
  const [notice, setNotice] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: "",
    message: "",
  });

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
      'script[src*="www.paypal.com/sdk/js"]',
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
    const paypalContainer = document.getElementById(
      "modal-paypal-button-container",
    );
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
          actions: Record<string, unknown>,
        ) {
          const planId = paypalPlanId || process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID;
          if (!planId) {
            throw new Error(
              "PayPal plan ID not configured. Please set up your PayPal subscription first.",
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
              setNotice({
                open: true,
                title: "Authentication error",
                message:
                  "Your session expired. Please sign in again to complete your subscription.",
              });
              return;
            }

            // Check if user already has an active subscription
            const { data: existingSubscription } = await supabase
              .from("subscriptions")
              .select("id, status, plan_name, next_billing_date")
              .eq("user_id", user.id)
              .eq("status", "active")
              .maybeSingle();

            // Only prevent if subscription is truly active (not expired)
            if (existingSubscription) {
              const isDayPass =
                existingSubscription.plan_name === "One-Day Pass";
              if (isDayPass && existingSubscription.next_billing_date) {
                const expiryDate = new Date(
                  existingSubscription.next_billing_date,
                );
                const now = new Date();
                if (expiryDate < now) {
                  // Day pass expired, continue with new subscription
                } else {
                  setNotice({
                    open: true,
                    title: "Subscription already active",
                    message: `You already have an active ${existingSubscription.plan_name}.`,
                  });
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                  return;
                }
              } else if (!isDayPass) {
                setNotice({
                  open: true,
                  title: "Subscription already active",
                  message: `You already have an active ${existingSubscription.plan_name}.`,
                });
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
                return;
              }
            }

            const subscriptionId = data.subscriptionID as string;
            const { error } = await supabase.from("subscriptions").insert({
              user_id: user.id,
              subscription_id: subscriptionId,
              plan_name: "Premium Plan",
              status: "active",
              amount: 25.0,
              next_billing_date: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            });

            if (error) {
              if (error.code === "23505") {
                setNotice({
                  open: true,
                  title: "Subscription already exists",
                  message: "This subscription is already in our system.",
                });
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
                return;
              }
              throw error;
            }

            setNotice({
              open: true,
              title: "Subscription successful",
              message: "Your Premium Plan is now active. Reloading...",
            });
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } catch (error) {
            console.error("Error saving subscription:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "An unexpected error occurred";
            setNotice({
              open: true,
              title: "Subscription error",
              message: `There was a problem saving your subscription: ${errorMessage}. Please contact support if this persists.`,
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
      .render("#modal-paypal-button-container");
  }, [paypalPlanId, supabase]);

  const renderOneDayButtons = useCallback(() => {
    const container = document.getElementById(
      "modal-paypal-one-day-button-container",
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
          actions: Record<string, unknown>,
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
          actions: Record<string, unknown>,
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
              setNotice({
                open: true,
                title: "Authentication error",
                message:
                  "Your session expired. Please sign in again to complete your purchase.",
              });
              return;
            }

            // Check if user already has an active subscription
            const { data: existingSubscription } = await supabase
              .from("subscriptions")
              .select("id, status, plan_name, next_billing_date")
              .eq("user_id", user.id)
              .eq("status", "active")
              .maybeSingle();

            // Only prevent if subscription is truly active (not expired)
            if (existingSubscription) {
              const isDayPass =
                existingSubscription.plan_name === "One-Day Pass";
              if (isDayPass && existingSubscription.next_billing_date) {
                const expiryDate = new Date(
                  existingSubscription.next_billing_date,
                );
                const now = new Date();
                if (expiryDate < now) {
                  // Day pass expired, continue with new purchase
                } else {
                  setNotice({
                    open: true,
                    title: "Subscription already active",
                    message: `You already have an active ${existingSubscription.plan_name}.`,
                  });
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                  return;
                }
              } else if (!isDayPass) {
                setNotice({
                  open: true,
                  title: "Subscription already active",
                  message: `You already have an active ${existingSubscription.plan_name}.`,
                });
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
                return;
              }
            }

            // Save one-day pass to subscriptions table
            const orderDetails = details as Record<string, unknown>;
            const orderId = orderDetails.id as string;
            const subscriptionId = `day-pass-${orderId}`;

            const { error } = await supabase.from("subscriptions").insert({
              user_id: user.id,
              subscription_id: subscriptionId,
              plan_name: "One-Day Pass",
              status: "active",
              amount: 5.0,
              next_billing_date: new Date(
                Date.now() + 24 * 60 * 60 * 1000,
              ).toISOString(),
            });

            if (error) {
              if (error.code === "23505") {
                setNotice({
                  open: true,
                  title: "Purchase already processed",
                  message: "This purchase is already in our system.",
                });
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
                return;
              }
              throw error;
            }

            setNotice({
              open: true,
              title: "Payment successful",
              message: "Your one-day pass has been activated. Reloading...",
            });
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } catch (err) {
            console.error("Error capturing order:", err);
            const errorMessage =
              err instanceof Error
                ? err.message
                : "An unexpected error occurred";
            setNotice({
              open: true,
              title: "Processing issue",
              message: `Payment captured but an error occurred processing your purchase: ${errorMessage}. Please contact support if this persists.`,
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
      .render("#modal-paypal-one-day-button-container");
  }, [supabase]);

  useEffect(() => {
    loadPayPalPlanId();
  }, [loadPayPalPlanId]);

  useEffect(() => {
    if (showPayPalButtons && window.paypal && paypalReady) {
      renderPayPalButtons();
    }
  }, [showPayPalButtons, paypalReady, renderPayPalButtons]);

  useEffect(() => {
    if (showOneDayButtons && window.paypal && paypalOrderReady) {
      renderOneDayButtons();
    }
  }, [showOneDayButtons, paypalOrderReady, renderOneDayButtons]);

  // Check if user is admin - run immediately when modal opens
  useEffect(() => {
    async function checkAdminStatus() {
      if (!open) return;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsAdmin(false);
          return;
        }

        // Check environment variables for admin emails
        const isAdminEmail = (email: string | undefined): boolean => {
          if (!email) return false;
          const normalizedEmail = email.toLowerCase().trim();
          const envEmails: string[] = (
            process.env.NEXT_PUBLIC_ADMIN_EMAILS &&
            process.env.NEXT_PUBLIC_ADMIN_EMAILS.length > 0
              ? process.env.NEXT_PUBLIC_ADMIN_EMAILS
              : [
                  process.env.NEXT_PUBLIC_ADMIN_EMAIL,
                  process.env.NEXT_PUBLIC_ADMIN_EMAIL_2,
                ]
                  .filter(Boolean)
                  .join(",")
          )
            .split(",")
            .map((s) => (s || "").trim().toLowerCase())
            .filter((s) => s.length > 0);

          const isMatch = envEmails.includes(normalizedEmail);

          console.log("PricingModal admin check:", {
            userEmail: normalizedEmail,
            adminEmails: envEmails,
            envVars: {
              ADMIN_EMAILS: process.env.NEXT_PUBLIC_ADMIN_EMAILS,
              ADMIN_EMAIL: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
              ADMIN_EMAIL_2: process.env.NEXT_PUBLIC_ADMIN_EMAIL_2,
            },
            isMatch,
          });

          return isMatch;
        };

        // Check admin database
        const { data: adminData } = await supabase
          .from("app_admins")
          .select("email")
          .eq("email", user.email)
          .maybeSingle();

        const userIsAdmin = isAdminEmail(user.email) || Boolean(adminData);

        console.log("PricingModal admin status:", {
          email: user.email,
          isAdminFromEnv: isAdminEmail(user.email),
          isAdminFromDB: Boolean(adminData),
          isAdmin: userIsAdmin,
        });

        setIsAdmin(userIsAdmin);

        // If user is admin and modal is required, force reload to clear modal state
        if (userIsAdmin && required) {
          console.log(
            "Admin detected in PricingModal - preventing modal display",
          );
          // Force reload to clear the modal state from parent
          window.location.reload();
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    }

    checkAdminStatus();
  }, [open, required, supabase]);

  // EMERGENCY BYPASS: Check localStorage for admin override
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      const adminOverride = localStorage.getItem("admin_override");
      if (adminOverride === "true") {
        console.log("Admin override detected in localStorage");
        setIsAdmin(true);
        if (required && onClose) {
          onClose();
        }
      }
    }
  }, [open, required, onClose]);

  // If modal isn't open, don't render anything
  if (!open) return null;

  // In free mode, show a simple informational modal instead of any payment UI.
  if (IS_FREE_MODE) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={required ? undefined : onClose}
        />
        <div className="relative z-10 w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
          {!required && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">
              Weblet GPT is currently free
            </h2>
            <p className="text-center text-neutral-700">
              All features are unlocked and completely free for now. You
              don&apos;t need a subscription or any payment to use the app.
            </p>
            <div className="flex justify-center pt-2">
              <Button onClick={required && !onClose ? undefined : onClose}>
                Continue to app
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show modal if user is admin
  if (isAdmin === true) return null;

  // Show loading state while checking admin status
  if (open && isAdmin === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 rounded-lg bg-white p-6 shadow-xl">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Verifying access...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={required ? undefined : onClose}
        />
        <div className="relative z-10 w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          {!required && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-center mb-2">
              Choose Your Plan
            </h2>
            <p className="text-center text-neutral-600">
              {required
                ? "You need an active subscription to access the app. Please select a plan below."
                : "Get started with Weblet GPT. Choose the plan that works best for you."}
            </p>
          </div>

          {notice.open && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold mb-1">{notice.title}</h4>
              <p className="text-sm text-blue-700">{notice.message}</p>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 items-stretch">
            {/* One-Day Pass */}
            <Card className="p-6 relative flex flex-col h-full">
              <div className="space-y-4 flex flex-col flex-1">
                <div>
                  <h3 className="text-2xl font-bold">One-Day Pass</h3>
                  <p className="text-4xl font-bold mt-2">$5.00</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    One-time payment
                  </p>
                </div>
                <ul className="space-y-2">
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
                  {selectedPlan === "day" && showOneDayButtons ? (
                    <div className="space-y-4">
                      <div id="modal-paypal-one-day-button-container"></div>
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
              </div>
            </Card>

            {/* Monthly Subscription */}
            <Card className="p-6 relative border-2 border-primary flex flex-col h-full">
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
                <ul className="space-y-2">
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
                  {selectedPlan === "monthly" && showPayPalButtons ? (
                    <div className="space-y-4">
                      <div id="modal-paypal-button-container"></div>
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
                        loadPayPalSDK({
                          intent: "subscription",
                          vault: true,
                        });
                      }}
                    >
                      Subscribe Now <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

