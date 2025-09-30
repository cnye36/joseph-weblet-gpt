import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import AvatarManager from "./AvatarManager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DeleteBotButton from "./DeleteBotButton";
import TemperatureSlider from "./TemperatureSlider";

export default async function BotAdminDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  if (!(await isAdmin())) {
    return <div className="p-6">Forbidden</div>;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("bots")
    .select("id, name, description, model, system, temperature, avatar_url")
    .eq("id", params.id)
    .maybeSingle();
  if (!data) return <div className="p-6">Not found</div>;

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
        <div className="text-lg font-medium">Edit Bot</div>
      </div>

      {/* Avatar Management Section - Moved to top */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <AvatarManager
          botId={data.id}
          currentAvatarUrl={data.avatar_url}
          botName={data.name}
        />
      </div>

      <form
        className="space-y-4"
        action={`/app/admin/bots/${params.id}/update`}
        method="post"
      >
        <div>
          <label className="block text-sm mb-1">ID</label>
          <input
            className="w-full border rounded px-3 py-2 bg-muted"
            value={data.id}
            disabled
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            name="name"
            className="w-full border rounded px-3 py-2"
            defaultValue={data.name}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea
            name="description"
            className="w-full border rounded px-3 py-2 min-h-20"
            defaultValue={data.description ?? ""}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Model (OpenRouter)</label>
          {models.length > 0 ? (
            <select
              name="model"
              className="w-full border rounded px-3 py-2"
              defaultValue={data.model}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="model"
              className="w-full border rounded px-3 py-2"
              defaultValue={data.model}
              required
            />
          )}
        </div>
        <div>
          <label className="block text-sm mb-1">System Prompt</label>
          <textarea
            name="system"
            className="w-full border rounded px-3 py-2 min-h-32"
            defaultValue={data.system}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Temperature</label>
          <TemperatureSlider defaultValue={data.temperature ?? 0.7} />
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded border cursor-pointer"
            formAction={`/app/admin/bots/${params.id}/update`}
          >
            Save
          </button>
          <DeleteBotButton botId={params.id} />
        </div>
      </form>
    </div>
  );
}
