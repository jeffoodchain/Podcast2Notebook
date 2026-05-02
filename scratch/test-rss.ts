import { parseSource, generateRssXml } from "../lib/podcast";

async function test() {
  const url = "https://podcasts.apple.com/tw/podcast/%E6%AA%B8%E6%AA%AC%E5%85%84%E5%BC%9F-lemon-brothers/id1535414840?i=1000653696542";
  console.log("Testing URL:", url);
  try {
    const metadata = await parseSource(url);
    console.log("Metadata extracted:", JSON.stringify(metadata, null, 2));
    const rss = generateRssXml(metadata);
    console.log("Generated RSS Preview (first 200 chars):", rss.substring(0, 200));
  } catch (e) {
    console.error("Test failed:", e);
  }
}

test();
