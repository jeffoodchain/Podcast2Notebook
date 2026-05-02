import { NextRequest, NextResponse } from "next/server";
import path from "path";
export const maxDuration = 1800; // 30 minutes

export async function POST(req: NextRequest) {
  try {
    const { fileId } = await req.json();
    if (!fileId) return NextResponse.json({ error: "fileId is required" }, { status: 400 });

    const uploadDir = path.join(process.cwd(), "uploads", "audio");
    
    // In MVP, we guess the extension since the fileId is the prefix.
    // We should ideally pass the exact filename, but we can search for it or assume from download step.
    // For simplicity, we assume we just pass the fileId and Python service expects absolute path.
    const fs = require("fs");
    const files = fs.readdirSync(uploadDir);
    const fileName = files.find((f: string) => f.startsWith(fileId));
    
    if (!fileName) {
      return NextResponse.json({ error: "Audio file not found locally" }, { status: 404 });
    }

    const filePath = path.join(uploadDir, fileName);

    // Call Python Service
    const pythonServiceUrl = process.env.TRANSCRIPTION_SERVICE_URL || "http://localhost:8000";
    
    const response = await fetch(`${pythonServiceUrl}/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath }),
      signal: AbortSignal.timeout(1800000), // 30 minutes
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Transcription Service Error: ${errText}`);
    }

    const data = await response.json();
    return NextResponse.json({
      transcript: data.text,
      segments: data.segments,
      language: data.language
    });
  } catch (error: any) {
    console.error("Transcription error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
