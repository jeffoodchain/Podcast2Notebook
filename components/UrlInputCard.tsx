"use client";
import { useState } from "react";
import { PodcastMetadata, ProcessingState } from "../lib/types";

export default function UrlInputCard({
  onProcess,
  state,
}: {
  onProcess: (url: string) => void;
  state: ProcessingState;
}) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onProcess(url.trim());
    }
  };

  const isLoading = state.status !== "idle" && state.status !== "completed" && state.status !== "error";

  return (
    <div className="glass-card p-8 rounded-2xl border shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary neon-glow"></div>
      <h2 className="text-2xl font-bold mb-2 tracking-tight">Podcast Intelligence Engine</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Deploy neural processing on RSS feeds, Apple Podcasts, or direct audio streams.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <input
            type="url"
            required
            placeholder="Paste podcast episode link here..."
            className="flex h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm backdrop-blur-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="relative h-12 px-8 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
              <span>Processing...</span>
            </>
          ) : (
            "Analyze & Extract"
          )}
        </button>
      </form>
    </div>
  );
}
