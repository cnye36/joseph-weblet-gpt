import { createClient } from "@/lib/supabase/server";

export default async function ActiveCompetitionsBadge() {
  const supabase = await createClient();

  // Count active competitions
  const { count } = await supabase
    .from("competitions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  if (!count || count === 0) return null;

  return (
    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
