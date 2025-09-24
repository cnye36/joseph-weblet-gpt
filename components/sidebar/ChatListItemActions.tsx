"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";

export default function ChatListItemActions({
  chatId,
  botId,
  title,
}: {
  chatId: string;
  botId: string;
  title: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const currentChat = params.get("chat");

  const handleRename = useCallback(async () => {
    const next = window.prompt("Rename chat", title);
    if (!next) return;
    const res = await fetch(`/api/chats/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    if (res.ok) router.refresh();
  }, [chatId, router, title]);

  const handleDelete = useCallback(async () => {
    const confirmed = window.confirm("Delete this chat? This cannot be undone.");
    if (!confirmed) return;
    const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
    if (!res.ok) return;
    if (currentChat === chatId) {
      router.replace(`/app/chat/${botId}`);
    }
    router.refresh();
  }, [botId, chatId, currentChat, router]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-70 hover:opacity-100">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={handleRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


