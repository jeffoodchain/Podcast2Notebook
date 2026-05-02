import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { PodcastMetadata } from "./types";

const parser = new Parser();

export function generateRssXml(metadata: PodcastMetadata): string {
  const now = new Date().toUTCString();
  const pubDate = metadata.publishedDate ? new Date(metadata.publishedDate).toUTCString() : now;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(metadata.podcastTitle || "Generated Podcast")}</title>
    <link>${metadata.originalUrl}</link>
    <language>zh-tw</language>
    <itunes:author>${escapeXml(metadata.podcastTitle || "Unknown")}</itunes:author>
    <description>${escapeXml(metadata.description || "")}</description>
    <item>
      <title>${escapeXml(metadata.episodeTitle || "Untitled Episode")}</title>
      <itunes:episodeType>full</itunes:episodeType>
      <description>${escapeXml(metadata.description || "")}</description>
      <content:encoded><![CDATA[${metadata.description || ""}]]></content:encoded>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${metadata.audioUrl}" type="audio/mpeg" length="0"/>
      <guid isPermaLink="false">${metadata.audioUrl}</guid>
    </item>
  </channel>
</rss>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case "\"": return "&quot;";
    }
    return c;
  });
}

export async function parseSource(url: string): Promise<PodcastMetadata> {
  // If it's directly an audio file
  if (url.endsWith(".mp3") || url.endsWith(".m4a") || url.endsWith(".wav")) {
    return {
      sourceType: "audio",
      audioUrl: url,
      originalUrl: url,
    };
  }

  // Check if it's an RSS feed
  try {
    const feed = await parser.parseURL(url);
    if (feed && feed.items && feed.items.length > 0) {
      // Get the latest episode
      const latestEpisode = feed.items[0];
      return {
        sourceType: "rss",
        podcastTitle: feed.title,
        episodeTitle: latestEpisode.title,
        publishedDate: latestEpisode.pubDate,
        description: latestEpisode.contentSnippet || latestEpisode.content,
        audioUrl: latestEpisode.enclosure?.url || "",
        originalUrl: url,
        rssUrl: url,
      };
    }
  } catch (e) {
    // Not an RSS feed, fallback to parsing HTML
  }

  // Fallback: It might be a podcast episode page, scrape for audio / RSS
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    // Try finding RSS link in the head
    const rssLink = $("link[type='application/rss+xml']").attr("href") || 
                    $("link[type='application/atom+xml']").attr("href");

    // Special handling for Apple Podcasts
    if (url.includes("podcasts.apple.com")) {
      const scripts = $("script[type='application/json']");
      for (let i = 0; i < scripts.length; i++) {
        try {
          const content = $(scripts[i]).text();
          if (content.includes("streamUrl")) {
            const streamMatch = content.match(/"streamUrl"\s*:\s*"(https:\/\/[^"]+)"/);
            const feedMatch = content.match(/"feedUrl"\s*:\s*"(https:\/\/[^"]+)"/);
            const titleMatch = content.match(/"title"\s*:\s*"([^"]+)"/);
            
            if (streamMatch) {
              return {
                sourceType: "episode",
                podcastTitle: $("meta[property='og:site_name']").attr("content") || "",
                episodeTitle: titleMatch ? titleMatch[1] : ($("meta[property='og:title']").attr("content") || $("title").text()),
                description: $("meta[property='og:description']").attr("content") || "",
                audioUrl: streamMatch[1],
                originalUrl: url,
                rssUrl: feedMatch ? feedMatch[1] : undefined,
              };
            }
          }
        } catch (e) {}
      }
    }

    // Try finding audio source directly
    const audioSrc = $("audio source").attr("src") || $("audio").attr("src") || $("meta[property='og:audio']").attr("content");
    
    if (audioSrc) {
      return {
        sourceType: "episode",
        podcastTitle: $("meta[property='og:site_name']").attr("content") || "",
        episodeTitle: $("meta[property='og:title']").attr("content") || $("title").text(),
        description: $("meta[property='og:description']").attr("content") || "",
        audioUrl: audioSrc,
        originalUrl: url,
        rssUrl: rssLink,
      };
    } else if (rssLink) {
      // Re-parse the RSS we found
      return parseSource(rssLink);
    }
  } catch (e) {
    console.error("Failed to parse HTML page", e);
  }

  throw new Error("Unsupported URL format or unable to find audio source.");
}
