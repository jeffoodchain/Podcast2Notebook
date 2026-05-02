import { parseSource } from "../lib/podcast";

const url = "https://podcasts.apple.com/tw/podcast/gooaye-%E8%82%A1%E7%99%8C/id1500839292?i=1000764261212";

async function test() {
  try {
    const metadata = await parseSource(url);
    console.log("Metadata:", JSON.stringify(metadata, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
