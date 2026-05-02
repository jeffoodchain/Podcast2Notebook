"use client";
import { PodcastMetadata } from "../lib/types";

export default function MetadataCard({ metadata }: { metadata: PodcastMetadata }) {
  if (!metadata) return null;

  return (
    <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm mt-6">
      <h2 className="text-xl font-semibold mb-4">Podcast Information</h2>
      <div className="space-y-3">
        <div>
          <span className="text-sm font-medium text-muted-foreground">Source Type:</span>
          <span className="ml-2 text-sm font-semibold uppercase px-2 py-1 bg-secondary rounded-md">{metadata.sourceType}</span>
        </div>
        {metadata.podcastTitle && (
          <div>
            <span className="text-sm font-medium text-muted-foreground">Podcast:</span>
            <span className="ml-2 text-sm">{metadata.podcastTitle}</span>
          </div>
        )}
        {metadata.episodeTitle && (
          <div>
            <span className="text-sm font-medium text-muted-foreground">Episode:</span>
            <span className="ml-2 text-sm font-medium">{metadata.episodeTitle}</span>
          </div>
        )}
        {metadata.publishedDate && (
          <div>
            <span className="text-sm font-medium text-muted-foreground">Published:</span>
            <span className="ml-2 text-sm">{new Date(metadata.publishedDate).toLocaleDateString()}</span>
          </div>
        )}
        <div className="pt-2">
          <span className="text-sm font-medium text-muted-foreground block mb-1">Audio URL:</span>
          <a href={metadata.audioUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline break-all">
            {metadata.audioUrl}
          </a>
        </div>
        {metadata.rssUrl && (
          <div className="pt-2">
            <span className="text-sm font-medium text-muted-foreground block mb-1">Generated RSS Feed:</span>
            <div className="flex items-center gap-2">
              <a href={metadata.rssUrl} target="_blank" rel="noreferrer" className="text-xs text-green-400 hover:underline break-all flex-grow">
                {metadata.rssUrl}
              </a>
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = metadata.rssUrl!;
                  link.download = metadata.rssUrl!.split('/').pop() || 'podcast.rss';
                  link.click();
                }}
                className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30 hover:bg-green-500/30 transition-colors"
              >
                Download RSS
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              You can upload this RSS file to NotebookLM as a source.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
