import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import Link from "next/link";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/app");

  async function signInWithPassword(formData: FormData) {
    "use server";
    const email = z.string().email().parse(formData.get("email"));
    const password = z.string().min(6).parse(formData.get("password"));
    const supabase = await createClient();
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Check if user has active subscription
    if (data.user) {
      // Check if user is admin first
      function isAdminEmail(email: string | undefined): boolean {
        if (!email) return false;
        const normalizedEmail = email.toLowerCase().trim();
        const envEmails: string[] = (
          process.env.ADMIN_EMAILS && process.env.ADMIN_EMAILS.length > 0
            ? process.env.ADMIN_EMAILS
            : [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAIL_2]
                .filter(Boolean)
                .join(",")
        )
          .split(",")
          .map((s) => (s || "").trim().toLowerCase())
          .filter((s) => s.length > 0);
        return envEmails.includes(normalizedEmail);
      }

      const { data: adminData } = await supabase
        .from("app_admins")
        .select("email")
        .eq("email", data.user.email)
        .maybeSingle();

      const userIsAdmin = isAdminEmail(data.user.email) || Boolean(adminData);

      // Admins don't need subscription
      if (userIsAdmin) {
        redirect("/app");
        return;
      }

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, plan_name, next_billing_date")
        .eq("user_id", data.user.id)
        .eq("status", "active")
        .maybeSingle();

      // Check if subscription is still valid (for day passes, check if not expired)
      if (subscription) {
        const isDayPass = subscription.plan_name === "One-Day Pass";
        if (isDayPass && subscription.next_billing_date) {
          const expiryDate = new Date(subscription.next_billing_date);
          const now = new Date();
          if (expiryDate < now) {
            // Day pass expired, redirect to pricing
            redirect("/pricing?expired=true");
          }
        }
        redirect("/app");
      } else {
        // No active subscription, redirect to pricing
        redirect("/pricing?required=true");
      }
    } else {
      redirect("/app");
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <form action={signInWithPassword} className="space-y-3 w-full max-w-sm">
        <Input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
        />
        <Input
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <Button size="lg" type="submit" className="w-full">
          Sign in
        </Button>
        <div className="text-sm text-center">
          <span className="text-muted-foreground">No account?</span>{" "}
          <Link href="/pricing" className="underline">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
}


