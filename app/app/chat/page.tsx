import { redirect } from "next/navigation";
import { bots, defaultBotId, type BotId } from "@/lib/bots";

export default function ChatRoutePage({ searchParams }: { searchParams: { bot?: string; chat?: string } }) {
  const rawBot = searchParams.bot;
  const chat = searchParams.chat;
  const selectedBot: BotId = (rawBot && rawBot in bots ? (rawBot as BotId) : defaultBotId);
  redirect(`/app/chat/${selectedBot}${chat ? `?chat=${chat}` : ""}`);
}


