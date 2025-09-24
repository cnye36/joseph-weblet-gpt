import { redirect } from "next/navigation";
import { bots, defaultBotId, type BotId } from "@/lib/bots";

export default async function ChatRoutePage(props: { searchParams: Promise<{ bot?: string; chat?: string }> }) {
  const searchParams = await props.searchParams;
  const rawBot = searchParams.bot;
  const chat = searchParams.chat;
  const selectedBot: BotId = (rawBot && rawBot in bots ? (rawBot as BotId) : defaultBotId);
  redirect(`/app/chat/${selectedBot}${chat ? `?chat=${chat}` : ""}`);
}


