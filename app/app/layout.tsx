"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PricingModal from "@/components/PricingModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function checkSubscription() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Not authenticated, redirect handled by middleware
          setIsChecking(false);
          return;
        }

        // Check if user is admin
        const { data: adminData } = await supabase
          .from("app_admins")
          .select("email")
          .eq("email", user.email)
          .maybeSingle();

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
          return envEmails.includes(normalizedEmail);
        };

        const userIsAdmin = isAdminEmail(user.email) || Boolean(adminData);

        if (userIsAdmin) {
          setIsChecking(false);
          return;
        }

        // Check subscription
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("status, plan_name, next_billing_date")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (!subscription) {
          setShowModal(true);
          setIsChecking(false);
          return;
        }

        // Check if day pass is expired
        const isDayPass = subscription.plan_name === "One-Day Pass";
        if (isDayPass && subscription.next_billing_date) {
          const expiryDate = new Date(subscription.next_billing_date);
          const now = new Date();
          if (expiryDate < now) {
            setShowModal(true);
            setIsChecking(false);
            return;
          }
        }

        setIsChecking(false);
      } catch (error) {
        console.error("Error checking subscription:", error);
        setIsChecking(false);
      }
    }

    checkSubscription();
  }, [supabase]);

  // Show loading while checking
  if (isChecking) {
    return (
      <main className="relative min-h-svh bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-svh bg-white">
      {children}
      <PricingModal open={showModal} required={true} />
    </main>
  );
}
