"use client";
import { useState, useRef } from "react";
import { ProcessingState } from "../lib/types";
import { Upload, FileAudio, X } from "lucide-react";

export default function FileUploadCard({
  onUpload,
  state,
}: {
  onUpload: (file: File) => void;
  state: ProcessingState;
}) {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onUpload(file);
    }
  };

  const isLoading = state.status !== "idle" && state.status !== "completed" && state.status !== "error";

  return (
    <div className="glass-card p-8 rounded-2xl border shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 neon-glow-emerald"></div>
      <h2 className="text-2xl font-bold mb-2 tracking-tight">Direct Audio Upload</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Upload MP3 or MP4 files directly for neural transcription and analysis.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div 
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer
            ${file ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-emerald-500/30 hover:bg-white/5"}
            ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".mp3,.mp4,.wav,.m4a"
            className="hidden"
            disabled={isLoading}
          />
          
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileAudio className="w-10 h-10 text-emerald-400" />
              <div className="text-center">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium">Click to select or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">MP3, MP4, WAV, M4A (Max 200MB)</p>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={!file || isLoading}
          className="w-full h-12 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Processing...</span>
            </>
          ) : (
            "Start Neural Transcription"
          )}
        </button>
      </form>
    </div>
  );
}
