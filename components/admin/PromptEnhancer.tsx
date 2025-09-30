'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface PromptEnhancerProps {
  onEnhanced: (enhancedPrompt: string) => void;
  currentPrompt: string;
}

export default function PromptEnhancer({ onEnhanced, currentPrompt }: PromptEnhancerProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);

  const enhancePrompt = async () => {
    if (!currentPrompt.trim()) {
      alert('Please enter a prompt to enhance');
      return;
    }

    setIsEnhancing(true);
    
    try {
      const response = await fetch('/api/admin/enhance-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: currentPrompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to enhance prompt');
      }

      const data = await response.json();
      onEnhanced(data.enhancedPrompt);
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      alert('Failed to enhance prompt. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={enhancePrompt}
        disabled={isEnhancing || !currentPrompt.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isEnhancing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {isEnhancing ? 'Enhancing...' : 'Enhance Prompt'}
      </button>
      <p className="text-xs text-gray-500 mt-1">
        Transform your prompt into a comprehensive, professional system prompt for scientific/technical use
      </p>
    </div>
  );
}
