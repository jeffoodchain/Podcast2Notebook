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

export type ProcessingStatus =
  | "idle"
  | "queued"
  | "parsing"
  | "downloading"
  | "transcribing"
  | "refining"
  | "generating"
  | "completed"
  | "error";

export interface OutputFiles {
  transcriptTextUrl?: string;
  transcriptMdUrl?: string;
  notebooklmSourceUrl?: string;
  summaryUrl?: string;
  notesUrl?: string;
  slidesUrl?: string;
  mindmapMdUrl?: string;
  mindmapHtmlUrl?: string;
}

export interface ProcessingState {
  status: ProcessingStatus;
  message?: string;
  progress?: number;
  metadata?: PodcastMetadata;
  fileId?: string;
  jobId?: string;
  outputFiles?: OutputFiles;
  driveLinks?: Record<string, string>;
  exportToCloud?: boolean;
}
