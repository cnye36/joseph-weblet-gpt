"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style: Record<string, string>;
        createSubscription: (data: Record<string, unknown>, actions: Record<string, unknown>) => Promise<unknown>;
        onApprove: (data: Record<string, unknown>, actions: Record<string, unknown>) => Promise<void>;
        onError: (err: Error) => void;
      }) => {
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
  const supabase = createClient();

  useEffect(() => {
    loadSubscription();
    loadPayPalScript();
  }, []);

  useEffect(() => {
    if (showPayPalButtons && window.paypal) {
      renderPayPalButtons();
    }
  }, [showPayPalButtons]);

  async function loadSubscription() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();

        if (data) {
          setSubscription(data);
        }
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  }

  function loadPayPalScript() {
    if (window.paypal) return;

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
    script.async = true;
    document.body.appendChild(script);
  }

  function renderPayPalButtons() {
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
        createSubscription: function (data: Record<string, unknown>, actions: Record<string, unknown>) {
          return ((actions as Record<string, unknown>).subscription as { create: (config: Record<string, unknown>) => Promise<unknown> }).create({
            plan_id: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID,
          });
        },
        onApprove: async function (data: Record<string, unknown>) {
          console.log("Subscription approved:", data);
          
          // Save subscription to database
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
                amount: 9.99,
                next_billing_date: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
              });

              if (error) throw error;

              alert("Subscription successful!");
              await loadSubscription();
              setShowPayPalButtons(false);
            }
          } catch (error) {
            console.error("Error saving subscription:", error);
            alert("Subscription created but error saving to database.");
          }
        },
        onError: function (err: Error) {
          console.error("PayPal error:", err);
          alert("An error occurred with PayPal. Please try again.");
        },
      })
      .render("#paypal-button-container");
  }

  async function cancelSubscription() {
    if (!subscription) return;

    if (!confirm("Are you sure you want to cancel your subscription?")) {
      return;
    }

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

      alert("Subscription cancelled successfully!");
      await loadSubscription();
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      alert("Error cancelling subscription. Please try again.");
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
      {/* Current Subscription */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Current Subscription</h3>
        {subscription ? (
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold">{subscription.plan_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    ${subscription.amount}/month
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status:{" "}
                    <span className="text-green-600 font-medium">
                      {subscription.status}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Next billing date:{" "}
                    {new Date(subscription.next_billing_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={cancelSubscription}
              >
                Cancel Subscription
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="text-center space-y-4">
              <div className="inline-flex p-3 bg-muted rounded-full">
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">No Active Subscription</h4>
                <p className="text-sm text-muted-foreground">
                  Subscribe to unlock premium features and support development.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Available Plans */}
      {!subscription && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Plans</h3>
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-lg">Premium Plan</h4>
                  <p className="text-2xl font-bold mt-2">$9.99/month</p>
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

              {!showPayPalButtons ? (
                <Button
                  className="w-full"
                  onClick={() => setShowPayPalButtons(true)}
                >
                  Subscribe Now
                </Button>
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

