"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { signUpAction } from "./actions";
import Modal from "@/components/ui/modal";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    const currentEmail = email;
    startTransition(async () => {
      const res = await signUpAction(email, password);
      if (res.ok) {
        setOpen(true);
      } else {
        setError(res.error || "Something went wrong");
      }
      // clear password fields regardless of outcome
      setPassword("");
      setConfirm("");
    });
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-3 w-full max-w-sm">
        <Input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          name="password"
          placeholder="Password (min 6)"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          name="confirm"
          placeholder="Confirm password"
          minLength={6}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <Button size="lg" type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating..." : "Create account"}
        </Button>
        <div className="text-sm text-center">
          <span className="text-muted-foreground">Already have an account?</span>{" "}
          <Link href="/login" className="underline">Sign in</Link>
        </div>
      </form>

      <Modal open={open} title="Check your email" dismissable={false}>
        <div className="space-y-3">
          <p>
            We just sent a confirmation link to <span className="font-medium">{email}</span>.
          </p>
          <p className="text-muted-foreground">
            Please check your inbox (and spam) to verify your email. You can close this page.
          </p>
        </div>
      </Modal>
    </>
  );
}


