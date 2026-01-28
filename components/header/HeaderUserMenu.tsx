"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { User, ChevronDown, CreditCard } from "lucide-react";
import LogoutButton from "@/components/sidebar/LogoutButton";
import SettingsModal from "@/components/settings/SettingsModal";

interface Props {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}

export default function HeaderUserMenu({ user }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"account" | "billing">(
    "account"
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate initials for users without an avatar
  const initials =
    user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    user.email[0]?.toUpperCase() ||
    "?";

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

  const openSettings = (tab: "account" | "billing") => {
    setSettingsTab(tab);
    setSettingsOpen(true);
    setIsOpen(false);
  };

  return (
    <div className="relative ml-2" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt={user.name}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
          />
        ) : (
          <div className="w-8 h-8 rounded-full border-2 border-gray-200 bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-semibold text-white">
            {initials}
          </div>
        )}
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-medium text-gray-900 leading-tight">
            {user.name}
          </span>
          <span className="text-xs text-gray-500 leading-tight">
            {user.email}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform hidden md:block ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-lg shadow-lg border py-2">
          {/* User Info (mobile) */}
          <div className="px-4 py-3 border-b md:hidden">
            <div className="font-medium text-sm text-gray-900">{user.name}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => openSettings("account")}
            >
              <User className="w-4 h-4" />
              <span>Account</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => openSettings("billing")}
            >
              <CreditCard className="w-4 h-4" />
              <span>Billing</span>
            </button>
          </div>

          <div className="border-t pt-1 px-2">
            <LogoutButton />
          </div>
        </div>
      )}

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialTab={settingsTab}
      />
    </div>
  );
}
