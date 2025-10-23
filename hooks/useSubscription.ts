"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Subscription = {
  id: string;
  user_id: string;
  subscription_id: string;
  plan_name: string;
  status: string;
  amount: number;
  next_billing_date: string;
  created_at: string;
  updated_at: string;
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSubscription(null);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (queryError && queryError.code !== "PGRST116") {
        throw queryError;
      }

      setSubscription(data);
    } catch (err) {
      console.error("Error loading subscription:", err);
      setError("Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }

  const hasActiveSubscription = !!subscription && subscription.status === "active";

  const isPremium = hasActiveSubscription;

  return {
    subscription,
    loading,
    error,
    hasActiveSubscription,
    isPremium,
    refresh: loadSubscription,
  };
}

