import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Format: YYYYMMDD-Upload-FileName
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const safeFileName = file.name.replace(/[\/\\?%*:|"<>]/g, "");
    const fileId = `${dateStr}-Upload-${Math.random().toString(36).substring(7)}`;
    
    const ext = path.extname(safeFileName) || ".mp3";
    const fileName = `${fileId}${ext}`;
    const uploadDir = path.join(process.cwd(), "uploads", "audio");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      fileId,
      fileName,
      filePath,
      metadata: {
        sourceType: "upload",
        podcastTitle: "Uploaded File",
        episodeTitle: safeFileName,
        publishedDate: new Date().toISOString(),
        audioUrl: `/api/files/audio/${fileName}`,
        originalUrl: safeFileName,
      }
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
