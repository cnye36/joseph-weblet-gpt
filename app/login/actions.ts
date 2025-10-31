"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signInWithPassword(formData: FormData) {
  const email = z.string().email().parse(formData.get("email"));
  const password = z.string().min(6).parse(formData.get("password"));
  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Handle login errors gracefully
  if (error) {
    // Check for specific error types
    if (
      error.message.includes("Invalid login credentials") ||
      error.message.includes("Invalid email or password")
    ) {
      // User doesn't exist or password is wrong
      redirect("/login?error=no_account");
    } else {
      // Other errors
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }
    return;
  }

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

    // Always redirect to app - the modal will handle subscription check
    redirect("/app");
    return;
  } else {
    redirect("/app");
  }
}

