import { google } from "googleapis";
import fs from "fs";
import path from "path";

/**
 * Uploads a local file to a specific Google Drive folder.
 * Returns the webViewLink of the uploaded file.
 */
export async function uploadToGoogleDrive(
  filePath: string, 
  fileName: string, 
  folderId: string
): Promise<string | null> {
  const authEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const authKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!authEmail || !authKey) {
    console.warn("Google Drive credentials missing. Skipping upload.");
    return null;
  }

  try {
    const auth = new google.auth.JWT(
      authEmail,
      undefined,
      authKey,
      ["https://www.googleapis.com/auth/drive.file"]
    );

    const drive = google.drive({ version: "v3", auth });

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: getMimeType(fileName),
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink",
    });

    console.log(`File uploaded to Google Drive: ${response.data.id}`);
    return response.data.webViewLink || null;
  } catch (error) {
    console.error("Error uploading to Google Drive:", error);
    return null;
  }
}

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".txt": return "text/plain";
    case ".md": return "text/markdown";
    case ".html": return "text/html";
    case ".pptx": return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".mp3": return "audio/mpeg";
    case ".mp4": return "video/mp4";
    default: return "application/octet-stream";
  }
}
