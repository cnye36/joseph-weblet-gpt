import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { Home, Trophy, Settings } from "lucide-react";
import { bots as staticBots } from "@/lib/bots";
import ActiveCompetitionsBadge from "@/components/sidebar/ActiveCompetitionsBadge";
import HeaderUserMenu from "./HeaderUserMenu";
import BotsDropdown from "./BotsDropdown";

export default async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = await isAdmin();

  if (!user) return null;

  // Fetch user profile for avatar and name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const name =
    profile?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";
  const email = user?.email || "user@example.com";
  // For now, only use stored avatar URLs (e.g., uploaded avatars).
  // If none is set, the UI will fall back to initials with a gradient background.
  const avatar = profile?.avatar_url || "";

  // Fetch all bots from database
  const { data: dbBots } = await supabase
    .from("bots")
    .select("id, name, avatar_url")
    .order("id");

  // Fallback to static bots if no bots in database
  const botsList =
    dbBots && dbBots.length > 0
      ? dbBots
      : Object.values(staticBots).map((b) => ({
          id: b.id,
          name: b.name,
          avatar_url: null,
        }));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/app"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/logo.png"
            alt="Weblet GPT"
            width={36}
            height={36}
            className="rounded-full shadow-sm"
            priority
          />
          <span className="font-semibold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hidden sm:block">
            Weblet GPT
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 md:gap-2">
          {/* Dashboard */}
          <Link
            href="/app"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          {/* Bots Dropdown */}
          <BotsDropdown bots={botsList} />

          {/* Competitions */}
          <Link
            href="/app/competitions"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors relative"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Competitions</span>
            <ActiveCompetitionsBadge />
          </Link>

          {/* Admin */}
          {admin && (
            <Link
              href="/app/admin"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">Admin</span>
            </Link>
          )}

          {/* User Menu */}
          <HeaderUserMenu user={{ name, email, avatar }} />
        </nav>
      </div>
    </header>
  );
}
