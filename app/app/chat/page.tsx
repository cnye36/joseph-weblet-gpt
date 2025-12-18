import { redirect } from "next/navigation";
import { bots, defaultBotId, type BotId } from "@/lib/bots";
import { createClient } from "@/lib/supabase/server";

export default async function ChatRoutePage(props: {
  searchParams: Promise<{ bot?: string; chat?: string; competitionId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const rawBot = searchParams.bot;
  const chat = searchParams.chat;
  const competitionId = searchParams.competitionId;

  // Check if bot exists in static bots or database
  let botExists = rawBot && rawBot in bots;

  if (!botExists && rawBot) {
    // Check database for dynamically created bots
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("bots")
        .select("id")
        .eq("id", rawBot)
        .maybeSingle();

      if (data) {
        botExists = true;
      }
    } catch (error) {
      console.error("Error checking bot in database:", error);
    }
  }

  const selectedBot: BotId = botExists ? (rawBot as BotId) : defaultBotId;

  const params = new URLSearchParams();
  if (chat) params.set("chat", chat);
  if (competitionId) params.set("competitionId", competitionId);

  const query = params.toString();
  redirect(`/app/chat/${selectedBot}${query ? `?${query}` : ""}`);
}


