"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { defaultBotId, bots, type BotId } from "@/lib/bots";

export default function NewChatButton() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);

  const handleNewChat = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const raw = params.get("bot");
      const bot: BotId = (raw && (raw in bots) ? (raw as BotId) : defaultBotId);
      const title = "New chat";
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: bot, title }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { id: string };
      router.replace(`/app/chat/${bot}?chat=${data.id}`);
    } finally {
      setLoading(false);
    }
  }, [loading, params, router]);

  return (
    <Button
      variant="secondary"
      onClick={handleNewChat}
      disabled={loading}
      className="w-full mb-4"
    >
      {loading ? "Creating..." : "New Chat"}
    </Button>
  );
}


