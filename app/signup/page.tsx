import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/app");

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <SignupForm />
    </div>
  );
}


