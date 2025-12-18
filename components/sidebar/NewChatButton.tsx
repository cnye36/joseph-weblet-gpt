"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { defaultBotId, bots, type BotId } from "@/lib/bots";

export default function NewChatButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const handleNewChat = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Extract bot ID from pathname (e.g., /app/chat/ganttrify-gpt -> ganttrify-gpt)
      const pathParts = pathname.split("/");
      const botFromPath = pathParts[pathParts.length - 1];
      
      let bot: BotId = defaultBotId;

      if (botFromPath) {
        // Check if bot exists in static bots first
        if (botFromPath in bots) {
          bot = botFromPath as BotId;
        } else {
          // Check database for dynamically created bots
          try {
            const checkRes = await fetch("/api/bots/check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ botId: botFromPath }),
            });

            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.exists) {
                bot = botFromPath as BotId;
              }
            }
          } catch (error) {
            console.error("Error checking bot existence:", error);
          }
        }
      }
      
      const title = "New chat";
      const competitionId = searchParams.get("competitionId");
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: bot,
          title,
          competitionId: competitionId || undefined,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { id: string };

      // Navigate to the new chat - the Chat component will handle title generation
      // when the first message is sent
      const params = new URLSearchParams();
      params.set("chat", data.id);
      params.set("new", "true");
      if (competitionId) params.set("competitionId", competitionId);
      router.replace(`/app/chat/${bot}?${params.toString()}`);
    } finally {
      setLoading(false);
    }
  }, [loading, pathname, router, searchParams]);

  return (
    <Button onClick={handleNewChat} disabled={loading} className="w-full mb-4">
      {loading ? "Creating..." : "New Chat"}
    </Button>
  );
}


