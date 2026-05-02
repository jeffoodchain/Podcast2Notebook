import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) return NextResponse.json({ error: "fileId is required" }, { status: 400 });

  try {
    const uploadDir = path.join(process.cwd(), "uploads", "audio");
    const files = fs.readdirSync(uploadDir);
    const fileName = files.find((f: string) => f.startsWith(fileId));
    
    if (!fileName) {
      return NextResponse.json({ status: "not_started" });
    }

    const filePath = path.join(uploadDir, fileName);
    const pythonServiceUrl = process.env.TRANSCRIPTION_SERVICE_URL || "http://localhost:8000";

    const response = await fetch(`${pythonServiceUrl}/progress?file_path=${encodeURIComponent(filePath)}`);
    if (!response.ok) throw new Error("Failed to fetch progress from Python service");

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
