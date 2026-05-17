import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const filePathParts = params.path;
    if (!filePathParts || filePathParts.length === 0) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

    let relativePath = filePathParts.join("/");
    let baseDir = path.join(process.cwd(), "uploads", "output");
    
    if (filePathParts[0] === "rss") {
      baseDir = path.join(process.cwd(), "uploads", "rss");
      relativePath = filePathParts.slice(1).join("/");
    } else if (filePathParts[0] === "audio") {
      baseDir = path.join(process.cwd(), "uploads", "audio");
      relativePath = filePathParts.slice(1).join("/");
    }

    const filePath = path.resolve(baseDir, relativePath);

    // Prevent directory traversal
    if (!filePath.startsWith(baseDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = filePathParts[filePathParts.length - 1];
    
    // Guess MIME type based on extension
    let contentType = "application/octet-stream";
    if (fileName.endsWith(".txt")) contentType = "text/plain";
    if (fileName.endsWith(".md")) contentType = "text/markdown";
    if (fileName.endsWith(".html")) contentType = "text/html";
    if (fileName.endsWith(".rss")) contentType = "application/rss+xml";
    if (fileName.endsWith(".mp3")) contentType = "audio/mpeg";
    if (fileName.endsWith(".m4a")) contentType = "audio/mp4";
    if (fileName.endsWith(".wav")) contentType = "audio/wav";
    if (fileName.endsWith(".mp4")) contentType = "video/mp4";
    if (fileName.endsWith(".pptx")) contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    // HTTP headers are Latin-1 only, so a filename with non-ASCII characters
    // (e.g. the Chinese 文字檔 / 簡報 / 心智圖 / 錄音檔 suffixes) must be sent
    // RFC 5987-encoded, with a sanitized ASCII fallback for old clients.
    const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
    const disposition = fileName.endsWith(".html") ? "inline" : "attachment";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
