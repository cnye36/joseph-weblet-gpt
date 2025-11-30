import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignupForm from "./SignupForm";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  // If user is authenticated, check subscription status
  if (data.user) {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status, plan_name, next_billing_date")
      .eq("user_id", data.user.id)
      .eq("status", "active")
      .maybeSingle();

    // If user has active subscription, redirect to app
    if (subscription) {
      const isDayPass = subscription.plan_name === "One-Day Pass";
      if (isDayPass && subscription.next_billing_date) {
        const expiryDate = new Date(subscription.next_billing_date);
        const now = new Date();
        if (expiryDate >= now) {
          redirect("/app");
        }
      } else if (!isDayPass) {
        redirect("/app");
      }
    }
    // If authenticated but no subscription, they can stay to sign up (might be verifying email)
  }

  return (
    <>
      <Header />
      <div className="flex min-h-svh items-center justify-center p-6">
        <SignupForm />
      </div>
      <Footer />
    </>
  );
}


