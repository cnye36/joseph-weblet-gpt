import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import Link from "next/link";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/app");

  async function signUp(formData: FormData) {
    "use server";
    const email = z.string().email().parse(formData.get("email"));
    const password = z.string().min(6).parse(formData.get("password"));
    const confirm = z.string().min(6).parse(formData.get("confirm"));
    if (password !== confirm) {
      throw new Error("Passwords do not match");
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    redirect("/app");
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <form action={signUp} className="space-y-3 w-full max-w-sm">
        <Input type="email" name="email" placeholder="you@example.com" required />
        <Input type="password" name="password" placeholder="Password (min 6)" minLength={6} required />
        <Input type="password" name="confirm" placeholder="Confirm password" minLength={6} required />
        <Button size="lg" type="submit" className="w-full">Create account</Button>
        <div className="text-sm text-center">
          <span className="text-muted-foreground">Already have an account?</span>{" "}
          <Link href="/login" className="underline">Sign in</Link>
        </div>
      </form>
    </div>
  );
}


