import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  text: string;
  segments: Segment[];
  language: string;
}

const SERVICE_URL =
  process.env.TRANSCRIPTION_SERVICE_URL || "http://localhost:8000";

/**
 * Sends an audio file to the Python faster-whisper service for transcription.
 *
 * The file is streamed over HTTP rather than passed as a path, so the web app
 * and the transcription service share no filesystem — they can run as separate
 * services / containers / hosts (e.g. two Zeabur services).
 *
 * Uses axios (Node's http module): a full episode can take many minutes, which
 * exceeds Node's built-in fetch (undici) fixed 5-minute headersTimeout.
 */
export async function transcribeAudio(
  filePath: string,
  transcriptionId: string
): Promise<TranscriptResult> {
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath), path.basename(filePath));
    form.append("transcription_id", transcriptionId);

    const res = await axios.post(`${SERVICE_URL}/transcribe`, form, {
      headers: form.getHeaders(),
      timeout: 0,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return res.data;
  } catch (err: any) {
    if (
      err.code === "ECONNREFUSED" ||
      err.code === "ECONNRESET" ||
      err.code === "ENOTFOUND"
    ) {
      throw new Error(
        "Transcription service is unreachable — check TRANSCRIPTION_SERVICE_URL and that the service is running."
      );
    }
    throw new Error(
      `Transcription Service Error: ${err.response?.data?.detail || err.message}`
    );
  }
}

/** Polls the Python service for transcription progress (0-100), or null. */
export async function getTranscriptionProgress(
  transcriptionId: string
): Promise<number | null> {
  try {
    const res = await axios.get(`${SERVICE_URL}/progress`, {
      params: { id: transcriptionId },
      timeout: 5000,
    });
    const d = res.data;
    if (d && d.total_time) {
      return Math.min(
        100,
        Math.round(((d.current_time || 0) / d.total_time) * 100)
      );
    }
    return null;
  } catch {
    return null;
  }
}
