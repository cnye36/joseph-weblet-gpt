"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "@/components/ui/sidebar";
import { IS_FREE_MODE } from "@/lib/utils";

export default function SubscriptionCountdown() {
  const { state } = useSidebar();
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function checkSubscription() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("plan_name, next_billing_date")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (!subscription || subscription.plan_name !== "One-Day Pass") {
          setLoading(false);
          return;
        }

        const expiryDate = new Date(subscription.next_billing_date);

        const updateCountdown = () => {
          const now = new Date();
          const diff = expiryDate.getTime() - now.getTime();

          if (diff <= 0) {
            setTimeLeft("Expired");
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return;
          }

          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          setTimeLeft(
            `${hours.toString().padStart(2, "0")}:${minutes
              .toString()
              .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
          );
        };

        updateCountdown();
        intervalRef.current = setInterval(updateCountdown, 1000);
        setLoading(false);

        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        };
      } catch (error) {
        console.error("Error checking subscription:", error);
        setLoading(false);
      }
    }

    checkSubscription();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [supabase]);

  // In free mode we don&apos;t show any countdown UI.
  if (IS_FREE_MODE) {
    return null;
  }

  if (loading || !timeLeft || state === "collapsed") {
    return null;
  }

  return (
    <div className="px-2 py-2 border-t border-sidebar-border">
      <div className="px-2 py-1.5 text-xs text-muted-foreground">
        <div className="font-medium mb-0.5">Time Left:</div>
        <div
          className={`font-mono text-sm ${
            timeLeft === "Expired" ? "text-red-600" : "text-foreground"
          }`}
        >
          {timeLeft}
        </div>
      </div>
    </div>
  );
}

