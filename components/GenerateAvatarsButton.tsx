"use client";

import { useState } from "react";

export default function GenerateAvatarsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleGenerateAvatars = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/generate-avatars', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('Avatars generated successfully!');
      } else {
        setMessage(`Error: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error generating avatars:", error);
      setMessage('Error generating avatars');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded">
      <div className="text-sm">Generate AI avatars for bots</div>
      <button 
        onClick={handleGenerateAvatars}
        disabled={isLoading}
        className="text-sm underline cursor-pointer disabled:opacity-50"
      >
        {isLoading ? 'Generating...' : 'Generate Avatars'}
      </button>
      {message && (
        <div className={`text-xs mt-1 ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
