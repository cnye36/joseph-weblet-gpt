import { isAdmin } from "@/lib/admin";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BotCreationForm from "@/components/admin/BotCreationForm";

export default async function NewBotPage() {
  if (!(await isAdmin())) return <div className="p-6">Forbidden</div>;

  // Fetch available models from OpenRouter (public list)
  let models: { id: string; name?: string }[] = [];
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        // Allow using the configured API key if available (better rate limits); it is optional for public list
        ...(process.env.OPENROUTER_API_KEY
          ? { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }
          : {}),
      },
      // Avoid caching stale lists in dev
      cache: "no-store",
    });
    const json = (await res.json()) as {
      data?: Array<{ id: string; name?: string }>;
    };
    models = json.data ?? [];
  } catch {}

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/app/admin"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </Link>
        <div className="text-lg font-medium">Create GPT</div>
      </div>
      <BotCreationForm models={models} />
    </div>
  );
}
