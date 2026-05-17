import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createJob } from "@/lib/jobStore";
import { processJob, JobInput } from "@/lib/pipeline";
import { DRIVE_COOKIE, GoogleTokens } from "@/lib/googleAuth";

/**
 * Creates a processing job and kicks off the pipeline in the background.
 * Accepts either JSON `{ url, refine, exportToCloud }` or multipart form-data
 * with a `file`. Returns immediately with `{ jobId }`; the client polls
 * GET /api/jobs/[id] for progress.
 *
 * The pipeline runs as a fire-and-forget promise — fine on a long-lived Node
 * server (next start / a container), but NOT on serverless functions, which
 * freeze once the response is sent.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let input: JobInput;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const safeName = file.name.replace(/[\/\\?%*:|"<>]/g, "");
      const fileId = `${dateStr}-Upload-${Math.random().toString(36).substring(7)}`;
      const ext = path.extname(safeName) || ".mp3";
      const fileName = `${fileId}${ext}`;

      const uploadDir = path.join(process.cwd(), "uploads", "audio");
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, fileName), buffer);

      input = {
        type: "upload",
        uploadFileId: fileId,
        uploadMetadata: {
          sourceType: "upload",
          podcastTitle: "Uploaded File",
          episodeTitle: safeName,
          publishedDate: new Date().toISOString(),
          audioUrl: `/api/files/audio/${fileName}`,
          originalUrl: safeName,
        },
        refine: formData.get("refine") === "true",
        exportToCloud: formData.get("exportToCloud") === "true",
      };
    } else {
      const body = await req.json();
      if (!body.url) {
        return NextResponse.json({ error: "url is required" }, { status: 400 });
      }
      input = {
        type: "url",
        url: String(body.url).trim(),
        refine: !!body.refine,
        exportToCloud: !!body.exportToCloud,
      };
    }

    // Capture the user's Drive tokens (if connected) at job-creation time —
    // the background pipeline has no request context of its own.
    const driveCookie = req.cookies.get(DRIVE_COOKIE)?.value;
    if (driveCookie) {
      try {
        input.googleTokens = JSON.parse(driveCookie) as GoogleTokens;
      } catch {
        // malformed cookie — proceed without Drive export
      }
    }
    console.log(
      `[jobs] new job — exportToCloud=${input.exportToCloud}, driveConnected=${!!input.googleTokens}`
    );

    const job = createJob();
    processJob(job.id, input); // fire-and-forget

    return NextResponse.json({ jobId: job.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
