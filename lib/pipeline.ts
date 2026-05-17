import fs from "fs";
import path from "path";
import { parseSource, generateRssXml } from "./podcast";
import { downloadAudio } from "./downloader";
import { transcribeAudio, getTranscriptionProgress } from "./transcriber";
import { refineTranscript } from "./transcriptRefiner";
import { generateContent } from "./contentGenerator";
import { generateSlides } from "./slideGenerator";
import { generateMindmap } from "./mindmapGenerator";
import { updateJob } from "./jobStore";
import { PodcastMetadata } from "./types";
import { GoogleTokens } from "./googleAuth";

export interface JobInput {
  type: "url" | "upload";
  url?: string;
  uploadFileId?: string;
  uploadMetadata?: PodcastMetadata;
  refine: boolean;
  exportToCloud: boolean;
  googleTokens?: GoogleTokens;
}

// Transcription is CPU-bound; running several at once just thrashes the box.
// This promise chain ensures one job transcribes at a time — others wait.
let transcribeLock: Promise<void> = Promise.resolve();

const sanitizeTitle = (t?: string) =>
  (t || "Podcast").replace(/[\/\\?%*:|"<>]/g, "").trim() || "Podcast";

/**
 * Runs the full parse → download → transcribe → refine → generate pipeline in
 * the background, mutating the job record as it advances. Never throws — any
 * failure is recorded on the job as status "error".
 */
export async function processJob(jobId: string, input: JobInput): Promise<void> {
  try {
    let metadata: PodcastMetadata;
    let fileId: string;

    if (input.type === "url") {
      updateJob(jobId, { status: "parsing", message: "Reading podcast source..." });
      metadata = await parseSource(input.url!);
      if (!metadata.audioUrl) {
        throw new Error("Could not find an audio source for that link.");
      }

      // Persist a generated RSS file (usable as a NotebookLM source).
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const title = sanitizeTitle(metadata.podcastTitle);
      const rssDir = path.join(process.cwd(), "uploads", "rss");
      fs.mkdirSync(rssDir, { recursive: true });
      const rssFileName = `${dateStr}-${title}-${Math.random()
        .toString(36)
        .substring(7)}.rss`;
      fs.writeFileSync(path.join(rssDir, rssFileName), generateRssXml(metadata));
      metadata.rssPath = path.join(rssDir, rssFileName);
      metadata.rssUrl = `/api/files/rss/${rssFileName}`;
      updateJob(jobId, { metadata });

      updateJob(jobId, { status: "downloading", message: "Downloading audio..." });
      const date = metadata.publishedDate ? new Date(metadata.publishedDate) : new Date();
      const dStr = date.toISOString().split("T")[0].replace(/-/g, "");
      const dl = await downloadAudio(metadata.audioUrl, `${dStr}-${title}-錄音檔`);
      fileId = dl.fileId;
      metadata.audioUrl = `/api/files/audio/${dl.fileName}`;
      updateJob(jobId, { fileId, metadata });
    } else {
      // The upload route already saved the file to uploads/audio.
      fileId = input.uploadFileId!;
      metadata = input.uploadMetadata!;
      updateJob(jobId, { fileId, metadata });
    }

    // Resolve the audio file on disk (exclude the <audio>.json transcript cache).
    const uploadDir = path.join(process.cwd(), "uploads", "audio");
    const audioFile = fs
      .readdirSync(uploadDir)
      .find((f) => f.startsWith(fileId) && !f.endsWith(".json"));
    if (!audioFile) throw new Error("Audio file not found after download.");
    const filePath = path.join(uploadDir, audioFile);

    // --- Transcribe (serialized across jobs) ---
    updateJob(jobId, {
      status: "transcribing",
      message: "Waiting for a transcription slot...",
      progress: 0,
    });
    const transcript = await runSerializedTranscription(jobId, filePath);

    // --- AI correction (optional) ---
    let segments = transcript.segments;
    let text = transcript.text;
    if (input.refine) {
      updateJob(jobId, {
        status: "refining",
        message: "AI is correcting the transcript...",
        progress: 0,
      });
      const refined = await refineTranscript(
        transcript.segments,
        {
          podcastTitle: metadata.podcastTitle,
          episodeTitle: metadata.episodeTitle,
          description: metadata.description,
        },
        (pct) => updateJob(jobId, { progress: pct })
      );
      segments = refined.segments;
      text = refined.text;
      if (!refined.refined) {
        console.warn(`[job ${jobId}] AI correction skipped/failed; using raw transcript.`);
      }
    }

    // --- Generate output artifacts ---
    updateJob(jobId, {
      status: "generating",
      message: "Generating notes, slides and mind map...",
    });
    const contentResult = await generateContent(metadata, text, segments, fileId);
    const slidesResult = await generateSlides(metadata, fileId);
    const mindmapResult = await generateMindmap(metadata, fileId);

    // --- Optional Google Drive export (into the user's own Drive via OAuth) ---
    let driveLinks: Record<string, string> = {};
    if (input.exportToCloud && !input.googleTokens) {
      console.warn(
        `[job ${jobId}] Sync to Drive is on but no Google account is connected — skipping upload.`
      );
    }
    if (input.exportToCloud && input.googleTokens) {
      updateJob(jobId, { message: "Uploading to Google Drive..." });
      try {
        const { uploadOutputsToDrive } = await import("./googleDrive");
        console.log(`[job ${jobId}] uploading outputs to Google Drive...`);
        driveLinks = await uploadOutputsToDrive(
          input.googleTokens,
          fileId.replace("-錄音檔", ""),
          [
            { key: "transcript_text", path: contentResult.transcriptPath },
            { key: "transcript_md", path: contentResult.cleanedMdPath },
            { key: "notebooklm_source", path: contentResult.notebookSourcePath },
            { key: "summary", path: contentResult.summaryPath },
            { key: "notes", path: contentResult.notesPath },
            { key: "slides", path: slidesResult.slidesPath },
            { key: "mindmap_md", path: mindmapResult.mindmapMdPath },
            { key: "mindmap_html", path: mindmapResult.mindmapHtmlPath },
          ]
        );
        console.log(
          `[job ${jobId}] Drive upload finished — ${Object.keys(driveLinks).length} file(s) linked.`
        );
      } catch (e) {
        console.error(`[job ${jobId}] Drive export failed`, e);
      }
    }

    updateJob(jobId, {
      status: "completed",
      message: "Done",
      progress: 100,
      outputFiles: {
        ...contentResult.files,
        slidesUrl: slidesResult.slidesUrl,
        mindmapMdUrl: mindmapResult.mindmapMdUrl,
        mindmapHtmlUrl: mindmapResult.mindmapHtmlUrl,
      },
      driveLinks,
    });
  } catch (err: any) {
    console.error(`Job ${jobId} failed`, err);
    updateJob(jobId, {
      status: "error",
      message: err.message || "An unexpected error occurred.",
      error: err.message,
    });
  }
}

async function runSerializedTranscription(jobId: string, filePath: string) {
  const previous = transcribeLock;
  let release!: () => void;
  transcribeLock = new Promise<void>((r) => (release = r));
  await previous;

  updateJob(jobId, { message: "Transcribing audio..." });
  const poller = setInterval(async () => {
    const pct = await getTranscriptionProgress(filePath);
    if (pct != null) updateJob(jobId, { progress: pct });
  }, 2000);

  try {
    return await transcribeAudio(filePath);
  } finally {
    clearInterval(poller);
    release();
  }
}
