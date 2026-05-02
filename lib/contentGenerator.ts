import fs from "fs";
import path from "path";
import { PodcastMetadata } from "./types";

export async function generateContent(
  metadata: PodcastMetadata, 
  transcript: string, 
  segments: any[], 
  fileId: string
) {
  const folderName = fileId.replace("-錄音檔", "");
  const outputDir = path.join(process.cwd(), "uploads", "output", folderName);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPrefix = fileId.replace("-錄音檔", "-文字檔");

  // Fallback content generator without LLM (MVP default)
  // 1. transcript.txt
  const transcriptPath = path.join(outputDir, `${outputPrefix}_transcript.txt`);
  fs.writeFileSync(transcriptPath, transcript);

  // 2. cleaned_transcript.md
  const cleanedTranscript = `# Transcript: ${metadata.episodeTitle || "Episode"}\n\n${segments.map(s => `**[${formatTime(s.start)}]** ${s.text}`).join("\n\n")}`;
  const cleanedMdPath = path.join(outputDir, `${outputPrefix}_cleaned.md`);
  fs.writeFileSync(cleanedMdPath, cleanedTranscript);

  // 3. notebooklm_source.md
  const notebookSource = `# Podcast Source for NotebookLM

## Episode Information
- Podcast Title: ${metadata.podcastTitle || "Unknown"}
- Episode Title: ${metadata.episodeTitle || "Unknown"}
- Published Date: ${metadata.publishedDate ? new Date(metadata.publishedDate).toLocaleDateString() : "Unknown"}
- Original URL: ${metadata.originalUrl}
- Audio URL: ${metadata.audioUrl}

## One-sentence Summary
This episode covers topics discussed in ${metadata.episodeTitle || "this podcast"}.

## Key Topics
- Topic 1
- Topic 2
- Topic 3

## Detailed Notes
### Core Arguments
...
### Important Examples
...
### People / Companies / Data Mentioned
...
### Further Research Questions
...

## Transcript
${transcript}
`;
  const notebookSourcePath = path.join(outputDir, `${outputPrefix}_notebooklm.md`);
  fs.writeFileSync(notebookSourcePath, notebookSource);

  // 4. summary.md
  const summaryContent = `# Summary: ${metadata.episodeTitle || "Episode"}\n\n- Quick summary generated from transcript (No LLM configured).`;
  const summaryPath = path.join(outputDir, `${outputPrefix}_summary.md`);
  fs.writeFileSync(summaryPath, summaryContent);

  // 5. notes.md
  const notesContent = `# Notes: ${metadata.episodeTitle || "Episode"}\n\n- Key points go here.`;
  const notesPath = path.join(outputDir, `${outputPrefix}_notes.md`);
  fs.writeFileSync(notesPath, notesContent);

  return {
    transcriptPath,
    cleanedMdPath,
    notebookSourcePath,
    summaryPath,
    notesPath,
    // Return generated filenames for API response
    files: {
      transcriptTextUrl: `/api/files/${folderName}/${outputPrefix}_transcript.txt`,
      transcriptMdUrl: `/api/files/${folderName}/${outputPrefix}_cleaned.md`,
      notebooklmSourceUrl: `/api/files/${folderName}/${outputPrefix}_notebooklm.md`,
      summaryUrl: `/api/files/${folderName}/${outputPrefix}_summary.md`,
      notesUrl: `/api/files/${folderName}/${outputPrefix}_notes.md`,
    }
  };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
