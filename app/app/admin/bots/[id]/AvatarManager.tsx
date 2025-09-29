"use client";

import { useState } from "react";
import Image from "next/image";
import { Wand2, Upload, RefreshCw, User } from "lucide-react";

interface AvatarManagerProps {
  botId: string;
  currentAvatarUrl?: string;
  botName: string;
}

export default function AvatarManager({ botId, currentAvatarUrl, botName }: AvatarManagerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleGenerateAvatar = async () => {
    setIsGenerating(true);
    setMessage(null);
    
    try {
      const response = await fetch(`/api/admin/bots/${botId}/generate-avatar`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAvatarUrl(data.avatarUrl);
        setMessage('AI avatar generated successfully!');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Error generating avatar');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setMessage('Invalid file type. Only PNG, JPG, and WebP are allowed.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('File too large. Maximum size is 5MB.');
        return;
      }
      
      setSelectedFile(file);
      setMessage(null);
    }
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setMessage(null);
    
    try {
      const formData = new FormData();
      formData.append('avatar', selectedFile);
      
      const response = await fetch(`/api/admin/bots/${botId}/upload-avatar`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAvatarUrl(data.avatarUrl);
        setMessage('Avatar uploaded successfully!');
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Error uploading avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <User className="w-5 h-5" />
          Avatar
        </h3>
        <div className="flex items-center gap-2">
          {/* Current Avatar Display */}
          {avatarUrl ? (
            <Image 
              src={avatarUrl} 
              alt={`${botName} avatar`}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
              {botName.charAt(0)}
            </div>
          )}
        </div>
      </div>
      
      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-3 rounded text-sm ${
          message.includes('Error') || message.includes('Invalid') || message.includes('too large')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}
      
      {/* Avatar Actions - Compact Layout */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Generate AI Avatar */}
        <div className="flex-1">
          <button
            onClick={handleGenerateAvatar}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate AI Avatar
              </>
            )}
          </button>
        </div>
        
        {/* Upload Custom Avatar */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="file"
              id="avatar-upload"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button
              onClick={handleUploadAvatar}
              disabled={!selectedFile || isUploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {selectedFile ? 'Upload Selected' : 'Choose File'}
                </>
              )}
            </button>
          </div>
          {selectedFile && (
            <p className="text-xs text-gray-600 mt-1 truncate">
              Selected: {selectedFile.name}
            </p>
          )}
        </div>
      </div>
      
      {/* Help Text */}
      <div className="mt-3 text-xs text-gray-500">
        <p>• AI Avatar: Creates contextually relevant avatar based on bot characteristics</p>
        <p>• Custom Upload: PNG, JPG, or WebP (max 5MB)</p>
      </div>
    </div>
  );
}
