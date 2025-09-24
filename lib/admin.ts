import { createClient } from '@/lib/supabase/server';

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const email = user.email?.toLowerCase();
  // Support multiple admin emails via ADMIN_EMAILS (comma-separated),
  // or fallback to ADMIN_EMAIL and ADMIN_EMAIL_2 for convenience
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
  if (email && envEmails.includes(email)) return true;
  const { data } = await supabase
    .from("app_admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  return Boolean(data);
}


