export interface PodcastMetadata {
  sourceType: "rss" | "episode" | "audio" | "upload";
  podcastTitle?: string;
  episodeTitle?: string;
  publishedDate?: string;
  description?: string;
  audioUrl: string;
  originalUrl: string;
  rssUrl?: string;
  rssPath?: string;
}

export interface ProcessingState {
  status: "idle" | "parsing" | "downloading" | "transcribing" | "generating" | "completed" | "error";
  message?: string;
  progress?: number;
  metadata?: PodcastMetadata;
  fileId?: string;
  outputFiles?: {
    transcriptTextUrl?: string;
    transcriptMdUrl?: string;
    notebooklmSourceUrl?: string;
    summaryUrl?: string;
    notesUrl?: string;
    slidesUrl?: string;
    mindmapMdUrl?: string;
    mindmapHtmlUrl?: string;
  };
  driveLinks?: Record<string, string>;
  exportToCloud?: boolean;
}
