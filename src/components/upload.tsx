"use client";

import React, { useCallback, useState } from "react";
import { Upload as UploadIcon, FileImage, FileVideo, FileAudio, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "video/mp4": ".mp4",
  "audio/wav": ".wav",
};

const ACCEPT_STRING = Object.keys(ACCEPTED_TYPES).join(",");

interface UploadProps {
  onFileSelect: (file: File) => void;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <FileImage className="h-6 w-6" />;
  if (type.startsWith("video/")) return <FileVideo className="h-6 w-6" />;
  if (type.startsWith("audio/")) return <FileAudio className="h-6 w-6" />;
  return <UploadIcon className="h-6 w-6" />;
}

export function UploadZone({ onFileSelect }: UploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES[file.type]) {
        alert("Unsupported file type. Please upload .jpg, .png, .mp4, or .wav files.");
        return;
      }
      setSelectedFile(file);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearFile = () => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleAnalyze = () => {
    if (selectedFile) onFileSelect(selectedFile);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !selectedFile && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 md:p-12 transition-all duration-200 cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-accent/50",
          selectedFile && "cursor-default"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={handleInputChange}
          className="hidden"
        />

        {!selectedFile ? (
          <>
            <div className="rounded-full bg-secondary p-4 mb-4">
              <UploadIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">
              Drop your file here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[".jpg", ".png", ".mp4", ".wav"].map((ext) => (
                <span
                  key={ext}
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-mono text-muted-foreground"
                >
                  {ext}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4 w-full">
            <div className="rounded-lg bg-secondary p-3">
              {getFileIcon(selectedFile.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="rounded-full p-1 hover:bg-secondary transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {selectedFile && (
        <Button size="lg" className="w-full" onClick={handleAnalyze}>
          Analyze File
        </Button>
      )}
    </div>
  );
}
