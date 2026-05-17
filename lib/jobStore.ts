import { PodcastMetadata, OutputFiles, ProcessingStatus } from "./types";

/**
 * A single processing job. The whole parse → transcribe → refine → generate
 * pipeline runs in the background and only mutates this record; the frontend
 * polls GET /api/jobs/[id] to observe progress.
 */
export interface Job {
  id: string;
  status: ProcessingStatus;
  message?: string;
  progress?: number;
  metadata?: PodcastMetadata;
  fileId?: string;
  outputFiles?: OutputFiles;
  driveLinks?: Record<string, string>;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// In-memory store. Stashed on globalThis so it survives Next.js dev hot-reload
// (which re-evaluates modules). This works for a single long-lived server
// process; a multi-instance deployment would swap this for Redis or similar.
const store: Map<string, Job> =
  ((globalThis as any).__p2nJobs as Map<string, Job>) ??
  ((globalThis as any).__p2nJobs = new Map<string, Job>());

const MAX_AGE_MS = 60 * 60 * 1000; // prune jobs older than 1h

function prune() {
  const now = Date.now();
  store.forEach((job, id) => {
    if (now - job.updatedAt > MAX_AGE_MS) store.delete(id);
  });
}

export function createJob(): Job {
  prune();
  const id = `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const job: Job = {
    id,
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  store.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return store.get(id);
}

export function updateJob(id: string, patch: Partial<Job>): Job | undefined {
  const job = store.get(id);
  if (!job) return undefined;
  Object.assign(job, patch, { updatedAt: Date.now() });
  return job;
}
