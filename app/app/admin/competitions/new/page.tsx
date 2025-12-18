import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CompetitionForm from "@/components/admin/CompetitionForm";

export default async function NewCompetitionPage() {
  if (!(await isAdmin())) {
    return <div className="p-6">Forbidden</div>;
  }

  const supabase = await createClient();

  // Fetch all bots for the dropdown
  const { data: bots } = await supabase
    .from("bots")
    .select("id, name, description, avatar_url")
    .order("name");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link
          href="/app/admin/competitions"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Competitions
        </Link>
        <div className="text-lg font-medium">Create New Competition</div>
      </div>

      <CompetitionForm bots={bots || []} />
    </div>
  );
}
