import axios from "axios";
import { Segment } from "./transcriber";

/**
 * AI transcript correction via Google Gemini (using its OpenAI-compatible
 * chat API).
 *
 * Speech-to-text output — especially for Chinese — contains homophone errors,
 * misrecognized proper nouns and poor punctuation. This pass fixes those
 * WITHOUT changing meaning. Segments are corrected in batches so per-segment
 * timestamps are preserved, and any failed/invalid batch falls back to the
 * original text, so a missing key or API error never breaks the pipeline.
 */

const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
// Larger batches mean fewer round-trips and more context for the model (better
// consistency of repeated names). Gemini 2.5 handles this easily — the only
// real constraint is a free-tier key's requests-per-minute. Override per
// deployment via env vars; drop the batch size if you hit free-tier RPM limits.
const BATCH_SIZE = Number(process.env.GEMINI_BATCH_SIZE) || 120;
const CONCURRENCY = Number(process.env.GEMINI_CONCURRENCY) || 4;
const MAX_OUTPUT_TOKENS = 32768;
const MAX_RETRIES = 6;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RefineContext {
  podcastTitle?: string;
  episodeTitle?: string;
  description?: string;
}

export interface RefineResult {
  segments: Segment[];
  text: string;
  refined: boolean;
}

const SYSTEM_PROMPT =
  "You are a meticulous transcript proofreader. The input is raw speech-to-text " +
  "output that contains recognition errors. Fix ONLY transcription errors: " +
  "homophone mistakes, misrecognized proper nouns / brand / person names, and " +
  "missing or wrong punctuation. Keep the SAME language as the input and preserve " +
  "the speaker's original wording and meaning — never translate, paraphrase, " +
  "summarize, censor, or add/remove content. Return corrected text only.";

export async function refineTranscript(
  segments: Segment[],
  context: RefineContext,
  onProgress?: (pct: number) => void
): Promise<RefineResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || segments.length === 0) {
    return { segments, text: joinText(segments), refined: false };
  }

  const batches: Segment[][] = [];
  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    batches.push(segments.slice(i, i + BATCH_SIZE));
  }

  const corrected: Segment[][] = new Array(batches.length);
  const succeeded: boolean[] = new Array(batches.length).fill(false);
  let done = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < batches.length) {
      const idx = cursor++;
      const result = await refineBatch(apiKey!, batches[idx], context);
      corrected[idx] = result.segments;
      succeeded[idx] = result.ok;
      done++;
      onProgress?.(Math.round((done / batches.length) * 100));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker)
  );

  const merged = corrected.flat();
  // "refined" is true only if at least one batch was actually corrected.
  return {
    segments: merged,
    text: joinText(merged),
    refined: succeeded.some(Boolean),
  };
}

async function refineBatch(
  apiKey: string,
  batch: Segment[],
  context: RefineContext
): Promise<{ segments: Segment[]; ok: boolean }> {
  const numbered = batch.map((s, i) => ({ id: i, text: s.text }));
  const userPrompt =
    `Podcast: ${context.podcastTitle || "Unknown"}\n` +
    `Episode: ${context.episodeTitle || "Unknown"}\n` +
    (context.description ? `Description: ${context.description}\n` : "") +
    `\nCorrect the transcription errors in these segments. Return a JSON object ` +
    `{"segments":[{"id":<id>,"text":"<corrected text>"}]} with EXACTLY the same ` +
    `ids and the same number of segments.\n\n` +
    JSON.stringify(numbered);

  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    // Headroom so a large batch's JSON output is never truncated mid-array
    // (a truncated response fails JSON.parse and falls back to the raw text).
    max_tokens: MAX_OUTPUT_TOKENS,
  };

  // Retry on 429 (rate limit) / 503 with exponential backoff — the Gemini free
  // tier rate-limits aggressively, so backing off is what lets a long
  // transcript finish rather than mostly falling back to the raw text.
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await axios.post(API_URL, body, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      });

      const content = res.data?.choices?.[0]?.message?.content;
      if (!content) return { segments: batch, ok: false };

      const parsed = JSON.parse(content);
      const arr = parsed.segments;
      // Structural guard: a mismatched count means we can't trust the alignment.
      if (!Array.isArray(arr) || arr.length !== batch.length) {
        return { segments: batch, ok: false };
      }

      const fixed = batch.map((s, i) => {
        const fix = arr.find((x: any) => x?.id === i);
        const text =
          typeof fix?.text === "string" && fix.text.trim() ? fix.text : s.text;
        return { ...s, text };
      });
      return { segments: fixed, ok: true };
    } catch (err: any) {
      const status = err.response?.status;
      if ((status === 429 || status === 503) && attempt < MAX_RETRIES) {
        const retryAfter = Number(err.response?.headers?.["retry-after"]);
        const wait =
          retryAfter > 0
            ? retryAfter * 1000
            : Math.min(60000, 2000 * 2 ** attempt) + Math.random() * 1000;
        await sleep(wait);
        continue;
      }
      const detail =
        err.response?.data?.error || err.response?.data || err.message;
      console.error("[refine] batch failed, keeping original:", detail);
      return { segments: batch, ok: false };
    }
  }
  return { segments: batch, ok: false };
}

function joinText(segments: Segment[]): string {
  return segments
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}
