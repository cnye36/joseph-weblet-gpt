"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { defaultBotId, bots, type BotId } from "@/lib/bots";

export default function NewChatButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  const handleNewChat = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Extract bot ID from pathname (e.g., /app/chat/ganttrify-gpt -> ganttrify-gpt)
      const pathParts = pathname.split("/");
      const botFromPath = pathParts[pathParts.length - 1];
      const bot: BotId =
        botFromPath && botFromPath in bots
          ? (botFromPath as BotId)
          : defaultBotId;
      const title = "New chat";
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: bot, title }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { id: string };

      // Navigate to the new chat - the Chat component will handle title generation
      // when the first message is sent
      router.replace(`/app/chat/${bot}?chat=${data.id}&new=true`);
    } finally {
      setLoading(false);
    }
  }, [loading, pathname, router]);

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


