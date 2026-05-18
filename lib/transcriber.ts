import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
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

const LOCAL_SERVICE_URL =
  process.env.TRANSCRIPTION_SERVICE_URL || "http://localhost:8000";
const OPENAI_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

// OpenAI's audio API rejects files over 25MB; compress anything close to it.
const OPENAI_MAX_BYTES = 25 * 1024 * 1024;
const COMPRESS_THRESHOLD = 24 * 1024 * 1024;

/**
 * True when OpenAI transcription is configured. When it is, the local
 * faster-whisper service is not used at all (and need not be deployed).
 */
export function usingOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Transcribes an audio file. Uses the OpenAI API when `OPENAI_API_KEY` is set,
 * otherwise falls back to the local faster-whisper service.
 */
export async function transcribeAudio(
  filePath: string,
  transcriptionId: string
): Promise<TranscriptResult> {
  if (usingOpenAI()) {
    return transcribeWithOpenAI(filePath);
  }
  return transcribeWithLocalService(filePath, transcriptionId);
}

/**
 * Transcription progress (0-100), or null. The OpenAI path is a single API
 * call with no incremental progress, so it always returns null there.
 */
export async function getTranscriptionProgress(
  transcriptionId: string
): Promise<number | null> {
  if (usingOpenAI()) return null;
  try {
    const res = await axios.get(`${LOCAL_SERVICE_URL}/progress`, {
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

// --- OpenAI API path ---------------------------------------------------------

async function transcribeWithOpenAI(filePath: string): Promise<TranscriptResult> {
  let uploadPath = filePath;
  let tmpPath: string | null = null;
  try {
    if (fs.statSync(filePath).size > COMPRESS_THRESHOLD) {
      tmpPath = await compressForUpload(filePath);
      uploadPath = tmpPath;
    }
    if (fs.statSync(uploadPath).size > OPENAI_MAX_BYTES) {
      throw new Error(
        "Audio is too long for OpenAI transcription (over 25MB even after " +
          "compression). Use a shorter file, or unset OPENAI_API_KEY to use " +
          "the local transcription service."
      );
    }

    // gpt-4o transcription models don't support verbose_json (no segments).
    const verbose = !OPENAI_MODEL.startsWith("gpt-4o");
    const form = new FormData();
    form.append("file", fs.createReadStream(uploadPath), path.basename(uploadPath));
    form.append("model", OPENAI_MODEL);
    form.append("response_format", verbose ? "verbose_json" : "json");

    const res = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        timeout: 0,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const data = res.data;
    const segments: Segment[] = Array.isArray(data.segments)
      ? data.segments.map((s: any) => ({
          start: s.start ?? 0,
          end: s.end ?? 0,
          text: s.text ?? "",
        }))
      : [];
    return {
      text: data.text || "",
      language: data.language || "unknown",
      // Fall back to one whole-transcript segment if the model gave no timestamps.
      segments: segments.length
        ? segments
        : [{ start: 0, end: 0, text: data.text || "" }],
    };
  } catch (err: any) {
    const detail = err.response?.data?.error?.message || err.message;
    throw new Error(`OpenAI transcription failed: ${detail}`);
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
    }
  }
}

/** Re-encodes audio to 16kHz mono low-bitrate MP3 to fit OpenAI's size limit. */
function compressForUpload(input: string): Promise<string> {
  const output = path.join(os.tmpdir(), `p2n-compress-${Date.now()}.mp3`);
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-y",
      "-i", input,
      "-ar", "16000",
      "-ac", "1",
      "-b:a", "40k",
      output,
    ]);
    let stderr = "";
    ff.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    ff.on("error", (e: any) => {
      reject(
        new Error(
          e.code === "ENOENT"
            ? "ffmpeg is required to compress large audio for OpenAI transcription but was not found."
            : e.message
        )
      );
    });
    ff.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`ffmpeg failed: ${stderr.slice(-300)}`));
    });
  });
}

// --- Local faster-whisper service path --------------------------------------

async function transcribeWithLocalService(
  filePath: string,
  transcriptionId: string
): Promise<TranscriptResult> {
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath), path.basename(filePath));
    form.append("transcription_id", transcriptionId);

    const res = await axios.post(`${LOCAL_SERVICE_URL}/transcribe`, form, {
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
        "Transcription service is unreachable — set OPENAI_API_KEY to use " +
          "OpenAI instead, or check TRANSCRIPTION_SERVICE_URL / that the " +
          "local service is running."
      );
    }
    throw new Error(
      `Transcription Service Error: ${err.response?.data?.detail || err.message}`
    );
  }
}
