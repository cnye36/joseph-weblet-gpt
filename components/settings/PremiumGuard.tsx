"use client";

import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { useState } from "react";
import SettingsModal from "./SettingsModal";

type PremiumGuardProps = {
  children: ReactNode;
  fallback?: ReactNode;
  message?: string;
};

export default function PremiumGuard({
  children,
  fallback,
  message = "This feature is only available for premium users.",
}: PremiumGuardProps) {
  const { isPremium, loading } = useSubscription();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPremium) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <>
        <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <div className="p-4 bg-muted rounded-full">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Premium Feature</h3>
            <p className="text-muted-foreground text-sm max-w-md">{message}</p>
          </div>
          <Button onClick={() => setSettingsOpen(true)}>
            Upgrade to Premium
          </Button>
        </div>
        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} initialTab="billing" />
      </>
    );
  }

  return <>{children}</>;
}

