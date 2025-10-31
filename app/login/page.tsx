import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { signInWithPassword } from "./actions";

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/app");

  const searchParams = await props.searchParams;
  const error = searchParams.error;

  return (
    <>
      <Header />
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error === "no_account" ? (
                <>
                  <p className="font-medium mb-2">Account not found</p>
                  <p>
                    No account exists with this email. Please{" "}
                    <Link href="/signup" className="underline font-medium">
                      sign up
                    </Link>{" "}
                    to create an account.
                  </p>
                </>
              ) : (
                <p>{decodeURIComponent(error)}</p>
              )}
            </div>
          )}
          <form action={signInWithPassword} className="space-y-3">
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
              <Link href="/signup" className="underline">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}


