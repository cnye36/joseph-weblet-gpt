"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bot, ChevronDown } from "lucide-react";

interface BotItem {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface Props {
  bots: BotItem[];
}

export default function BotsDropdown({ bots }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <Bot className="w-4 h-4" />
        <span className="hidden sm:inline">Weblets</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-72 bg-white rounded-lg shadow-lg border py-2 max-h-96 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Available Weblets ({bots.length})
          </div>
          {bots.map((bot) => (
            <Link
              key={bot.id}
              href={`/app/chat/${bot.id}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              {bot.avatar_url ? (
                <Image
                  src={bot.avatar_url}
                  alt={`${bot.name} avatar`}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                  {bot.name.charAt(0)}
                </div>
              )}
              <span className="text-sm font-medium text-gray-900">
                {bot.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
