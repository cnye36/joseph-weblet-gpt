import { createClient } from '@/lib/supabase/server';

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const email = user.email?.toLowerCase();

  // Support multiple admin emails - check both NEXT_PUBLIC_ (for consistency) and non-prefixed versions
  // First try NEXT_PUBLIC_ variables, then fallback to non-prefixed
  const envEmails: string[] = (
    process.env.NEXT_PUBLIC_ADMIN_EMAILS &&
    process.env.NEXT_PUBLIC_ADMIN_EMAILS.length > 0
      ? process.env.NEXT_PUBLIC_ADMIN_EMAILS
      : process.env.ADMIN_EMAILS && process.env.ADMIN_EMAILS.length > 0
      ? process.env.ADMIN_EMAILS
      : [
          process.env.NEXT_PUBLIC_ADMIN_EMAIL,
          process.env.NEXT_PUBLIC_ADMIN_EMAIL_2,
          process.env.ADMIN_EMAIL,
          process.env.ADMIN_EMAIL_2,
        ]
          .filter(Boolean)
          .join(",")
  )
    .split(",")
    .map((s) => (s || "").trim().toLowerCase())
    .filter((s) => s.length > 0);
  

  // Check admin database
  const { data } = await supabase
    .from("app_admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  const isAdminFromDB = Boolean(data);

  const isAdminFromEnv = !!email && envEmails.includes(email);

  return isAdminFromDB || isAdminFromEnv;
}


