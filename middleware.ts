import { NextResponse, type NextRequest } from 'next/server';
import { CookieOptions, createServerClient } from '@supabase/ssr';

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
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const isAuthed = Boolean(data.user);
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login');
  const isAppRoute = req.nextUrl.pathname.startsWith('/app');

  if (!isAuthed && isAppRoute) {
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthed && isAuthRoute) {
    const redirectUrl = new URL('/app', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/app/:path*', '/login'],
};


