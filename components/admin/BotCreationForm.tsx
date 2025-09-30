'use client';

import { useState } from 'react';
import TemperatureSlider from '@/components/TemperatureSlider';
import PromptEnhancer from './PromptEnhancer';

interface BotCreationFormProps {
  models: { id: string; name?: string }[];
}

export default function BotCreationForm({ models }: BotCreationFormProps) {
  const [systemPrompt, setSystemPrompt] = useState('');

  const handleEnhanced = (enhancedPrompt: string) => {
    setSystemPrompt(enhancedPrompt);
  };

  return (
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
        <PromptEnhancer onEnhanced={handleEnhanced} currentPrompt={systemPrompt} />
        <textarea
          name="system"
          className="w-full border rounded px-3 py-2 min-h-32"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Temperature</label>
        <TemperatureSlider defaultValue={0.3} />
      </div>
      <button
        className="px-3 py-2 rounded border cursor-pointer"
        type="submit"
      >
        Create
      </button>
    </form>
  );
}
