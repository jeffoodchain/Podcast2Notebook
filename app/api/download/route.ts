import { NextRequest, NextResponse } from "next/server";
import { downloadAudio } from "@/lib/downloader";

export async function POST(req: NextRequest) {
  try {
    const { audioUrl, metadata } = await req.json();
    if (!audioUrl) return NextResponse.json({ error: "Audio URL is required" }, { status: 400 });

    // Format: YYYYMMDD-PodcastName-錄音檔
    const date = metadata?.publishedDate ? new Date(metadata.publishedDate) : new Date();
    const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
    const podcastTitle = (metadata?.podcastTitle || "Podcast").replace(/[\/\\?%*:|"<>]/g, "");
    const prefix = `${dateStr}-${podcastTitle}-錄音檔`;

    const result = await downloadAudio(audioUrl, prefix);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
