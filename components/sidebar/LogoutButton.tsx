"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const [pending, setPending] = useState(false);
  return (
    <form action="/auth/logout" method="post" onSubmit={() => setPending(true)}>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing out..." : "Logout"}
      </Button>
    </form>
  );
}


