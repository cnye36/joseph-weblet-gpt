"use client";

import { useState } from "react";
import Link from "next/link";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { Bot, ChevronRight, ChevronDown } from "lucide-react";
import { bots } from "@/lib/bots";

export default function GPTsAccordion() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={() => setIsOpen(!isOpen)}>
        <Bot className="size-4" />
        <span>GPTs</span>
        {isOpen ? (
          <ChevronDown className="ml-auto size-4" />
        ) : (
          <ChevronRight className="ml-auto size-4" />
        )}
      </SidebarMenuButton>
      {isOpen && (
        <SidebarMenuSub className="space-y-2">
          {Object.values(bots).map((bot) => (
            <SidebarMenuSubItem key={bot.id}>
              <SidebarMenuSubButton asChild>
                <Link href={`/app/chat/${bot.id}`} className="block truncate" title={bot.name}>
                  {bot.name.length > 25 ? `${bot.name.substring(0, 25)}...` : bot.name}
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}
