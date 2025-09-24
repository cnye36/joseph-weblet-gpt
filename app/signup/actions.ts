"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SignUpResult = {
  ok: boolean;
  error?: string;
};

export async function signUpAction(email: string, password: string): Promise<SignUpResult> {
  try {
    const parsedEmail = z.string().email().parse(email);
    const parsedPassword = z.string().min(6).parse(password);

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email: parsedEmail,
      password: parsedPassword,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return { ok: false, error: message };
  }
}


