"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CreditCard, CheckCircle2, ArrowUpRight } from "lucide-react";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: unknown) => {
        render: (selector: string) => void;
      };
    };
  }
}

type Subscription = {
  id: string;
  plan_name: string;
  status: string;
  subscription_id: string;
  next_billing_date: string;
  amount: number;
};

export default function BillingSettings() {
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showPayPalButtons, setShowPayPalButtons] = useState(false);
  const [showOneDayButtons, setShowOneDayButtons] = useState(false);
  const [paypalPlanId, setPaypalPlanId] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalOrderReady, setPaypalOrderReady] = useState(false);
  const [notice, setNotice] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const supabase = createClient();

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (data) {
          setSubscription(data);
        }
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const loadPayPalPlanId = useCallback(async () => {
    // Try to get plan ID from environment variable first
    const envPlanId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID;
    if (envPlanId) {
      setPaypalPlanId(envPlanId);
      return;
    }

    // If no plan ID in env, check if we need to set up PayPal
    console.log("No PayPal plan ID found in environment variables");
  }, []);

  async function setupPayPalSubscription() {
    try {
      setSetupLoading(true);

      const response = await fetch("/api/paypal/setup-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productName: "Joseph Weblet App Premium",
          productDescription:
            "Premium subscription for Joseph Weblet App with unlimited conversations, priority support, and advanced AI features",
          planName: "Premium Plan",
          price: "25.00",
          currency: "USD",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPaypalPlanId(result.data.plan.id);
        alert(
          `PayPal subscription setup successful!\n\nPlan ID: ${result.data.plan.id}\nProduct ID: ${result.data.product.id}\n\nPlease add these to your .env.local file and restart your development server.`
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error setting up PayPal subscription:", error);
      alert(
        `Error setting up PayPal subscription: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setSetupLoading(false);
    }
  }

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

    // Always unload any previously loaded SDK to avoid intent mismatches
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

    // Clear any existing buttons
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

            if (user) {
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

              await loadSubscription();
              setShowPayPalButtons(false);
              setNotice({
                open: true,
                title: "Subscription successful",
                message: "Your Premium Plan is now active.",
              });
            }
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
  }, [paypalPlanId, supabase, loadSubscription]);

  // Removed old loader; use loadPayPalSDK directly when needed

  useEffect(() => {
    loadSubscription();
    loadPayPalPlanId();
  }, [loadSubscription, loadPayPalPlanId]);

  useEffect(() => {
    if (showPayPalButtons && window.paypal) {
      renderPayPalButtons();
    }
  }, [showPayPalButtons, paypalReady, renderPayPalButtons]);

  useEffect(() => {
    if (showOneDayButtons && window.paypal) {
      renderOneDayButtons();
    }
  }, [showOneDayButtons, paypalOrderReady]);

  function renderOneDayButtons() {
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
            setNotice({
              open: true,
              title: "Payment successful",
              message: "Your one-day pass has been activated.",
            });
            setShowOneDayButtons(false);
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
  }

  async function cancelSubscription() {
    if (!subscription) return;
    try {
      // Call API to cancel PayPal subscription
      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: subscription.subscription_id,
        }),
      });

      if (!response.ok) throw new Error("Failed to cancel subscription");

      // Update database
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("id", subscription.id);

      if (error) throw error;
      await loadSubscription();
      setNotice({
        open: true,
        title: "Subscription cancelled",
        message: "Your subscription has been cancelled.",
      });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      setNotice({
        open: true,
        title: "Cancellation failed",
        message:
          "There was an error cancelling your subscription. Please try again.",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
      {confirmCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmCancelOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold mb-2">Cancel subscription?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to cancel your subscription?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmCancelOpen(false)}
              >
                Keep subscription
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setConfirmCancelOpen(false);
                  await cancelSubscription();
                }}
              >
                Cancel subscription
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Current Subscription */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Current Plan</h3>
        {subscription ? (
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold">{subscription.plan_name}</h4>
                  {subscription.plan_name === "One-Day Pass" ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        ${subscription.amount} one-time payment
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Expires:{" "}
                        {new Date(
                          subscription.next_billing_date
                        ).toLocaleDateString("en-US", {
                          timeZone: "UTC",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {new Date(
                          subscription.next_billing_date
                        ).toLocaleTimeString("en-US", {
                          timeZone: "UTC",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })}{" "}
                        UTC
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        ${subscription.amount}/month
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Next billing date:{" "}
                        {new Date(
                          subscription.next_billing_date
                        ).toLocaleDateString()}
                      </p>
                    </>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Status:{" "}
                    <span className="text-green-600 font-medium">
                      {subscription.status}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {subscription.plan_name === "One-Day Pass" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      window.location.href = "/pricing";
                    }}
                  >
                    Upgrade to Premium <ArrowUpRight className="ml-1 w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmCancelOpen(true)}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="text-center space-y-4">
              <div className="inline-flex p-3 bg-muted rounded-full">
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">No Active Plan</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Subscribe to unlock premium features and support development.
                </p>
                <Button
                  onClick={() => {
                    window.location.href = "/pricing";
                  }}
                >
                  View Plans
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Available Plans - Remove this section as payment is now on pricing page */}
      {false && !subscription && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Plans</h3>
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-lg">Premium Plan</h4>
                  <p className="text-2xl font-bold mt-2">$25.00/month</p>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Unlimited conversations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Priority support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Advanced AI features
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      No ads
                    </li>
                  </ul>
                </div>
              </div>

              {!paypalPlanId && !process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID ? (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      PayPal subscription not configured. Click the button below
                      to set up your subscription product and plan.
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={setupPayPalSubscription}
                    disabled={setupLoading}
                  >
                    {setupLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting up PayPal...
                      </>
                    ) : (
                      "Set Up PayPal Subscription"
                    )}
                  </Button>
                </div>
              ) : !showPayPalButtons ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      setShowOneDayButtons(false);
                      setShowPayPalButtons(true);
                      loadPayPalSDK({ intent: "subscription", vault: true });
                    }}
                  >
                    Subscribe Monthly ($25)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowPayPalButtons(false);
                      setShowOneDayButtons(true);
                      loadPayPalSDK({ intent: "capture" });
                    }}
                  >
                    Buy 1-Day Pass ($5)
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div id="paypal-button-container"></div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPayPalButtons(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              {showOneDayButtons && (
                <div className="space-y-4">
                  <div id="paypal-one-day-button-container"></div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowOneDayButtons(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Billing History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Billing History</h3>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            No billing history yet.
          </p>
        </Card>
      </div>
    </div>
  );
}

