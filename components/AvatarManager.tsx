"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Wand2, Upload, RefreshCw, X } from "lucide-react";

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch {
      setMessage('Error generating avatar');
    } finally {
      setIsGenerating(false);
    }
  };

  const validateFile = (file: File): boolean => {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage('Invalid file type. Only PNG, JPG, and WebP are allowed.');
      return false;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('File too large. Maximum size is 5MB.');
      return false;
    }
    
    return true;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setMessage(null);
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    const file = files[0];
    
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setMessage(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const openUploadModal = () => {
    setShowUploadModal(true);
    setSelectedFile(null);
    setMessage(null);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        closeUploadModal();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage('Error uploading avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      {/* Message Display */}
      {message && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            message.includes("Error") ||
            message.includes("Invalid") ||
            message.includes("too large")
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* Avatar Display and Actions */}
      <div className="flex flex-col items-center gap-3">
        {/* Large Avatar Display */}
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={`${botName} avatar`}
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-2xl">
              {botName.charAt(0)}
            </div>
          )}
        </div>

        {/* Compact Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerateAvatar}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate
              </>
            )}
          </button>

          <button
            onClick={openUploadModal}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Upload Avatar</h3>
              <button
                onClick={closeUploadModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleUploadClick}
            >
              {selectedFile ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUploadAvatar();
                    }}
                    disabled={isUploading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm mx-auto"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload Avatar
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="text-gray-600">
                    Drop your image here or{' '}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUploadClick();
                      }}
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      Upload an image
                    </button>
                  </p>
                  <p className="text-xs text-gray-400">
                    PNG, JPG, WebP (max 5MB)
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={closeUploadModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
