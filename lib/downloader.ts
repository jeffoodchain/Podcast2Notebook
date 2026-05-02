import fs from "fs";
import path from "path";
import axios from "axios";

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export async function downloadAudio(
  audioUrl: string, 
  prefix: string
): Promise<{ fileId: string; filePath: string; fileName: string; fileSize: number }> {
  // Security check: only allow http/https
  if (!audioUrl.startsWith("http://") && !audioUrl.startsWith("https://")) {
    throw new Error("Invalid URL scheme. Only HTTP and HTTPS are allowed.");
  }

  // SSRF Protection: rudimentary check for private IPs or localhost (in production use a better validator)
  try {
    const urlObj = new URL(audioUrl);
    const hostname = urlObj.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
      throw new Error("Downloading from local network is not allowed.");
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("Downloading from local network")) {
      throw e;
    }
    throw new Error("Invalid URL format.");
  }

  const response = await axios({
    method: "GET",
    url: audioUrl,
    responseType: "stream",
    timeout: 30000,
  });

  const contentLength = response.headers["content-length"];
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
    throw new Error(`File is too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }

  const fileId = prefix;
  // Guess extension from URL or headers
  let ext = ".mp3";
  if (audioUrl.includes(".m4a")) ext = ".m4a";
  if (audioUrl.includes(".wav")) ext = ".wav";
  
  const fileName = `${fileId}${ext}`;
  const uploadDir = path.join(process.cwd(), "uploads", "audio");
  
  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, fileName);
  const writer = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    let downloadedSize = 0;
    
    response.data.on("data", (chunk: Buffer) => {
      downloadedSize += chunk.length;
      if (downloadedSize > MAX_FILE_SIZE) {
        writer.destroy();
        fs.unlink(filePath, () => {}); // delete partial file
        reject(new Error("File exceeded maximum allowed size during download."));
      }
    });

    response.data.pipe(writer);

    writer.on("finish", () => {
      resolve({
        fileId,
        fileName,
        filePath,
        fileSize: downloadedSize,
      });
    });

    writer.on("error", (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}
