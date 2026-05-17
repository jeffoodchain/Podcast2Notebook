import axios from "axios";

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
 * Calls the Python faster-whisper service. Uses axios (Node's http module)
 * rather than fetch: a full episode can take many minutes, during which the
 * service holds the connection open without sending headers — Node's built-in
 * fetch (undici) aborts that after a fixed 5-minute headersTimeout.
 */
export async function transcribeAudio(
  filePath: string
): Promise<TranscriptResult> {
  try {
    const res = await axios.post(
      `${SERVICE_URL}/transcribe`,
      { file_path: filePath },
      { timeout: 0, headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (err: any) {
    if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
      throw new Error(
        "Transcription service is unreachable. Start it with: cd python-service && ./venv/bin/python main.py"
      );
    }
    throw new Error(
      `Transcription Service Error: ${err.response?.data?.detail || err.message}`
    );
  }
}

/** Polls the Python service for transcription progress (0-100), or null. */
export async function getTranscriptionProgress(
  filePath: string
): Promise<number | null> {
  try {
    const res = await axios.get(`${SERVICE_URL}/progress`, {
      params: { file_path: filePath },
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
