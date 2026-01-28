import { NextResponse, type NextRequest } from 'next/server';
import { CookieOptions, createServerClient } from '@supabase/ssr';
import { IS_FREE_MODE } from "@/lib/utils";

// Timeout for database operations in middleware (5 seconds)
const DB_TIMEOUT_MS = 5000;

// Helper to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Database operation timed out')), timeoutMs)
    ),
  ]);
}

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
  
  try {
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
      },
    );

    // Wrap getUser in timeout and error handling
    let userData;
    try {
      const getUserPromise = supabase.auth.getUser();
      const result = await withTimeout(getUserPromise, DB_TIMEOUT_MS);
      userData = result.data;
    } catch (error) {
      // On timeout or error, assume unauthenticated to allow request through
      // The app will handle auth checks at the page level
      console.warn(
        "Middleware: Auth check timed out or failed, allowing request:",
        error,
      );
      return res;
    }

    const isAuthed = Boolean(userData?.user);
    const isAuthRoute =
      req.nextUrl.pathname.startsWith("/login") ||
      req.nextUrl.pathname.startsWith("/signup");
    const isAppRoute = req.nextUrl.pathname.startsWith("/app");

    // In free mode we keep basic auth protection (login required for /app)
    // but bypass all subscription/paywall logic.
    if (IS_FREE_MODE) {
      // Redirect unauthenticated users trying to access app routes
      if (!isAuthed && isAppRoute) {
        const redirectUrl = new URL("/login", req.url);
        return NextResponse.redirect(redirectUrl);
      }

      // Redirect authenticated users away from auth routes straight into the app
      if (isAuthed && isAuthRoute) {
        const redirectUrl = new URL("/app", req.url);
        return NextResponse.redirect(redirectUrl);
      }

      // Otherwise allow request through without any subscription checks
      return res;
    }

    // Redirect unauthenticated users trying to access app routes
    if (!isAuthed && isAppRoute) {
      const redirectUrl = new URL("/login", req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Handle authenticated users accessing auth routes (already logged in)
    if (isAuthed && isAuthRoute && userData?.user) {
      const user = userData.user;

      // Check admin status - first check env vars (synchronous, fast)
      const isEnvAdmin = isAdminEmail(user.email);

      // Only query database if not already an admin via env vars
      let userIsAdmin = isEnvAdmin;
      if (!isEnvAdmin) {
        try {
          const adminQueryPromise = supabase
            .from("app_admins")
            .select("email")
            .eq("email", user.email)
            .maybeSingle() as unknown as Promise<{
            data: { email: string } | null;
          }>;
          const { data: adminData } = await withTimeout(
            adminQueryPromise,
            DB_TIMEOUT_MS,
          );
          userIsAdmin = Boolean(adminData);
        } catch (error) {
          // On timeout, assume not admin - user will be checked at page level
          console.warn(
            "Middleware: Admin check timed out, allowing request:",
            error,
          );
        }
      }

      // Admin users always allowed
      if (userIsAdmin) {
        const redirectUrl = new URL("/app", req.url);
        return NextResponse.redirect(redirectUrl);
      }

      // Check if regular user has active subscription
      try {
        const subscriptionQueryPromise = supabase
          .from("subscriptions")
          .select("status, plan_name, next_billing_date")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle() as unknown as Promise<{
          data: {
            status: string;
            plan_name: string;
            next_billing_date: string | null;
          } | null;
        }>;
        const { data: subscription } = await withTimeout(
          subscriptionQueryPromise,
          DB_TIMEOUT_MS,
        );

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
      } catch (error) {
        // On timeout, allow request - subscription check will happen at page level
        console.warn(
          "Middleware: Subscription check timed out, allowing request:",
          error,
        );
      }
    }

    // Allow authenticated users to access app routes
    // The PricingModal component will handle subscription enforcement
    if (isAuthed && isAppRoute) {
      return res;
    }

    return res;
  } catch (error) {
    // Catch any unexpected errors and allow request through
    // Better to allow access than block users due to middleware errors
    console.error("Middleware: Unexpected error, allowing request:", error);
    return res;
  }
}

export const config = {
  matcher: ['/app/:path*', '/login'],
};


