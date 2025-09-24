import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function NewBotPage() {
  if (!(await isAdmin())) return <div className="p-6">Forbidden</div>;
  return (
    <div className="p-6 max-w-3xl">
      <div className="text-lg font-medium mb-4">Create GPT</div>
      <form className="space-y-4" action="/app/admin/bots/new/create" method="post">
        <div>
          <label className="block text-sm mb-1">ID (slug)</label>
          <input name="id" className="w-full border rounded px-3 py-2" placeholder="my-bot-id" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input name="name" className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea name="description" className="w-full border rounded px-3 py-2 min-h-20" />
        </div>
        <div>
          <label className="block text-sm mb-1">Model (OpenRouter)</label>
          <input name="model" className="w-full border rounded px-3 py-2" placeholder="openai/gpt-4.1" required />
        </div>
        <div>
          <label className="block text-sm mb-1">System Prompt</label>
          <textarea name="system" className="w-full border rounded px-3 py-2 min-h-32" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Temperature</label>
          <input name="temperature" type="number" min={0} max={2} step={0.1} className="w-full border rounded px-3 py-2" defaultValue={1} />
        </div>
        <button className="px-3 py-2 rounded border" type="submit">Create</button>
      </form>
    </div>
  );
}


