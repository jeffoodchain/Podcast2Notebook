import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/contentGenerator";
import { generateSlides } from "@/lib/slideGenerator";
import { generateMindmap } from "@/lib/mindmapGenerator";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { metadata, transcript, segments, fileId, exportToCloud } = await req.json();
    if (!metadata || !transcript || !fileId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Generate core content (Markdown files, txt)
    const contentResult = await generateContent(metadata, transcript, segments, fileId);

    // 2. Generate slides (.pptx)
    const slidesResult = await generateSlides(metadata, fileId);

    // 3. Generate mindmap (.md, .html)
    const mindmapResult = await generateMindmap(metadata, fileId);

    // 4. Export to Google Drive (Optional)
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const driveLinks: Record<string, string> = {};
    
    if (folderId && exportToCloud) {
      const { uploadToGoogleDrive } = await import("@/lib/googleDrive");
      
      // Map local paths to filenames
      const filesToUpload: Record<string, string> = {
        "transcript_text": contentResult.transcriptPath,
        "transcript_md": contentResult.cleanedMdPath,
        "notebooklm_source": contentResult.notebookSourcePath,
        "summary": contentResult.summaryPath,
        "notes": contentResult.notesPath,
        "slides": slidesResult.slidesPath,
        "mindmap_md": mindmapResult.mindmapMdPath,
        "mindmap_html": mindmapResult.mindmapHtmlPath,
      };

      for (const [key, localPath] of Object.entries(filesToUpload)) {
        try {
          const fileName = path.basename(localPath);
          const link = await uploadToGoogleDrive(localPath, fileName, folderId);
          if (link) driveLinks[key] = link;
        } catch (e) {
          console.error(`Failed to upload ${key} to Drive`, e);
        }
      }
    }

    return NextResponse.json({
      files: {
        ...contentResult.files,
        slidesUrl: slidesResult.slidesUrl,
        mindmapMdUrl: mindmapResult.mindmapMdUrl,
        mindmapHtmlUrl: mindmapResult.mindmapHtmlUrl,
      },
      driveLinks
    });
  } catch (error: any) {
    console.error("Content generation error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
