import { NextResponse, type NextRequest } from 'next/server';
import { CookieOptions, createServerClient } from '@supabase/ssr';

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

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const isAuthed = Boolean(data.user);
  const isAuthRoute =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/signup");
  const isAppRoute = req.nextUrl.pathname.startsWith("/app");

  // Redirect unauthenticated users trying to access app routes
  if (!isAuthed && isAppRoute) {
    const redirectUrl = new URL("/login", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Handle authenticated users accessing auth routes (already logged in)
  if (isAuthed && isAuthRoute) {
    // Check if user is admin
    if (data.user) {
      const { data: adminData } = await supabase
        .from("app_admins")
        .select("email")
        .eq("email", data.user.email)
        .maybeSingle();

      const userIsAdmin = isAdminEmail(data.user.email) || Boolean(adminData);

      // Admin users always allowed
      if (userIsAdmin) {
        const redirectUrl = new URL("/app", req.url);
        return NextResponse.redirect(redirectUrl);
      }

      // Check if regular user has active subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, plan_name, next_billing_date")
        .eq("user_id", data.user.id)
        .eq("status", "active")
        .maybeSingle();

      if (subscription) {
        const isDayPass = subscription.plan_name === "One-Day Pass";
        if (isDayPass && subscription.next_billing_date) {
          const expiryDate = new Date(subscription.next_billing_date);
          const now = new Date();
          if (expiryDate >= now) {
            const redirectUrl = new URL("/app", req.url);
            return NextResponse.redirect(redirectUrl);
          }
        } else if (!isDayPass) {
          const redirectUrl = new URL("/app", req.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  // Allow authenticated users to access app routes
  // The PricingModal component will handle subscription enforcement
  if (isAuthed && isAppRoute) {
    return res;
  }

  return res;
}

export const config = {
  matcher: ['/app/:path*', '/login'],
};


