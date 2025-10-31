import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // After email verification, redirect to login page
    // User needs to sign in, then the modal will handle subscription check
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Default redirect to login
  return NextResponse.redirect(new URL("/login", request.url));
}


