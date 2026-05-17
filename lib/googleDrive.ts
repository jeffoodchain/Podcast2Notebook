import { google, drive_v3 } from "googleapis";
import fs from "fs";
import path from "path";
import { GoogleTokens, clientFromTokens } from "./googleAuth";

/**
 * Uploads generated artifacts to the user's own Google Drive via OAuth.
 *
 * With the `drive.file` scope the app can only see/manage files it created, so
 * folder lookups here only ever match this app's own folders — exactly what we
 * want. The root "Podcast2Notebook" folder and a per-episode subfolder are
 * created automatically on first use; the user never has to set anything up.
 */

const ROOT_FOLDER_NAME = "Podcast2Notebook";
const FOLDER_MIME = "application/vnd.google-apps.folder";

function mimeFor(file: string): string {
  switch (path.extname(file).toLowerCase()) {
    case ".txt": return "text/plain";
    case ".md": return "text/markdown";
    case ".html": return "text/html";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".mp3": return "audio/mpeg";
    case ".mp4": return "video/mp4";
    default: return "application/octet-stream";
  }
}

/** Finds an app-created folder by name, creating it if absent. */
async function ensureFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<string> {
  const q = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    `mimeType = '${FOLDER_MIME}'`,
    "trashed = false",
    parentId ? `'${parentId}' in parents` : undefined,
  ]
    .filter(Boolean)
    .join(" and ");

  const found = await drive.files.list({ q, fields: "files(id)", spaces: "drive" });
  if (found.data.files && found.data.files.length > 0) {
    return found.data.files[0].id!;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id",
  });
  return created.data.id!;
}

/**
 * Uploads the given local files into `Podcast2Notebook/<subfolder>` in the
 * user's Drive. Returns a map of key → shareable webViewLink. Individual file
 * failures are logged and skipped so one bad file can't abort the batch.
 */
export async function uploadOutputsToDrive(
  tokens: GoogleTokens,
  subfolder: string,
  files: { key: string; path: string }[]
): Promise<Record<string, string>> {
  const drive = google.drive({ version: "v3", auth: clientFromTokens(tokens) });

  const rootId = await ensureFolder(drive, ROOT_FOLDER_NAME);
  const folderId = await ensureFolder(drive, subfolder, rootId);

  const links: Record<string, string> = {};
  for (const { key, path: localPath } of files) {
    try {
      if (!fs.existsSync(localPath)) continue;
      const res = await drive.files.create({
        requestBody: { name: path.basename(localPath), parents: [folderId] },
        media: { mimeType: mimeFor(localPath), body: fs.createReadStream(localPath) },
        fields: "id, webViewLink",
      });
      if (res.data.webViewLink) links[key] = res.data.webViewLink;
    } catch (e) {
      console.error(`Drive upload failed for ${key}`, e);
    }
  }
  return links;
}
