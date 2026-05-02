import { NextRequest, NextResponse } from "next/server";
import { parseSource, generateRssXml } from "@/lib/podcast";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const metadata = await parseSource(url);
    
    // Generate and save RSS file
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const podcastTitle = (metadata.podcastTitle || "Podcast").replace(/[\/\\?%*:|"<>]/g, "");
    const fileId = `${dateStr}-${podcastTitle}-${Math.random().toString(36).substring(7)}`;
    
    const rssXml = generateRssXml(metadata);
    const rssDir = path.join(process.cwd(), "uploads", "rss");
    if (!fs.existsSync(rssDir)) {
      fs.mkdirSync(rssDir, { recursive: true });
    }
    
    const rssFileName = `${fileId}.rss`;
    const rssPath = path.join(rssDir, rssFileName);
    fs.writeFileSync(rssPath, rssXml);
    
    metadata.rssPath = rssPath;
    metadata.rssUrl = `/api/files/rss/${rssFileName}`;

    return NextResponse.json(metadata);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
