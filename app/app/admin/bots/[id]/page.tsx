"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function EditBotPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [system, setSystem] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/bots/${id}`);
      if (res.ok) {
        const { bot } = (await res.json()) as { bot: { name: string; model: string; system: string } };
        setName(bot.name); setModel(bot.model); setSystem(bot.system);
      }
      setLoading(false);
    })();
  }, [id]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/bots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, model, system }),
    });
    setSaving(false);
    if (res.ok) router.push('/app/admin');
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="text-lg font-medium">Edit Bot</div>
      <div className="space-y-2">
        <label className="text-sm">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm">Model</label>
        <Input value={model} onChange={(e) => setModel(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm">System Prompt</label>
        <Textarea className="min-h-40" value={system} onChange={(e) => setSystem(e.target.value)} />
      </div>
      <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
    </div>
  );
}


