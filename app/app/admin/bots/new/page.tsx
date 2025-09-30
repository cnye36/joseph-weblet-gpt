import { isAdmin } from "@/lib/admin";
import TemperatureSlider from "../[id]/TemperatureSlider";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
      <form
        className="space-y-4"
        action="/app/admin/bots/new/create"
        method="post"
      >
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            name="name"
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea
            name="description"
            className="w-full border rounded px-3 py-2 min-h-20"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Model (OpenRouter)</label>
          {models.length > 0 ? (
            <select
              name="model"
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Select a model...</option>
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
              placeholder="openai/gpt-4.1"
              required
            />
          )}
        </div>
        <div>
          <label className="block text-sm mb-1">System Prompt</label>
          <textarea
            name="system"
            className="w-full border rounded px-3 py-2 min-h-32"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Temperature</label>
          <TemperatureSlider defaultValue={0.7} />
        </div>
        <button
          className="px-3 py-2 rounded border cursor-pointer"
          type="submit"
        >
          Create
        </button>
      </form>
    </div>
  );
}


