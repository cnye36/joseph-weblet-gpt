'use client';

import { useState } from 'react';
import TemperatureSlider from '@/components/TemperatureSlider';
import PromptEnhancer from './PromptEnhancer';

interface BotCreationFormProps {
  models: { id: string; name?: string }[];
}

export default function BotCreationForm({ models }: BotCreationFormProps) {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleEnhanced = (enhancedPrompt: string) => {
    setSystemPrompt(enhancedPrompt);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/app/admin/bots/new/create', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Weblet created successfully! Redirecting...' });
        // Optional: Redirect after a short delay or let the server handle it if it was a form submit
        // Since we are using fetch, we need to manually redirect if the server doesn't return a redirect response we can follow
        // or if we want to show the success message first.
        // Assuming the server action redirects, fetch might follow it.
        // If the server action returns a redirect, fetch follows it automatically.
        // But to show the message, we might want to wait a bit.
        
        // Let's check if we landed on a new page.
        if (response.redirected) {
             window.location.href = response.url;
             return;
        }
        
        // If not redirected, maybe we should redirect manually to the list
         setTimeout(() => {
             window.location.href = '/app/admin';
         }, 1500);

      } else {
        setMessage({ type: 'error', text: 'Failed to create Weblet. Please try again.' });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error creating bot:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit}
    >
      {message && (
        <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}
      <div>
        <label className="block text-sm mb-1">Name</label>
        <input
          name="name"
          className="w-full border rounded px-3 py-2"
          required
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Description</label>
        <textarea
          name="description"
          className="w-full border rounded px-3 py-2 min-h-20"
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Model (OpenRouter)</label>
        {models.length > 0 ? (
          <select
            name="model"
            className="w-full border rounded px-3 py-2"
            required
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Temperature</label>
        <TemperatureSlider defaultValue={0.3} />
      </div>
      <button
        className="px-3 py-2 rounded border cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
