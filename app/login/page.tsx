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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    redirect("/app");
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <form action={signInWithPassword} className="space-y-3 w-full max-w-sm">
        <Input type="email" name="email" placeholder="you@example.com" required />
        <Input type="password" name="password" placeholder="Password" required />
        <Button size="lg" type="submit" className="w-full">Sign in</Button>
        <div className="text-sm text-center">
          <span className="text-muted-foreground">No account?</span>{" "}
          <Link href="/signup" className="underline">Sign up</Link>
        </div>
      </form>
    </div>
  );
}


