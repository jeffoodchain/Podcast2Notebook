# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Podcast2Notebook turns a podcast (RSS feed, episode page, direct audio URL, or uploaded file) into a set of generated artifacts: transcript, NotebookLM source markdown, summary/notes, a `.pptx` slide deck, and a mind map. It is a two-process app: a Next.js 14 App Router frontend+backend, and a separate Python FastAPI transcription microservice.

## Running

Easiest: `docker compose up --build` (Dockerfile + `python-service/Dockerfile` + `docker-compose.yml`) — runs both services, shares an `uploads` volume between them, caches the whisper model in `hf-cache`. The Next image uses `output: "standalone"`.

For local dev without Docker, two processes must both be running:

```bash
# Terminal 1 — transcription service (http://localhost:8000)
cd python-service
pip install -r requirements.txt
python main.py

# Terminal 2 — Next.js app (http://localhost:3000)
npm install
npm run dev
```

Other commands: `npm run build`, `npm run start`, `npm run lint`. There is no test suite — files in `scratch/` are ad-hoc manual test scripts, not a runner.

Copy `.env.example` to `.env` for config. All env vars are optional; the app degrades gracefully without them (see below).

## Architecture

### Processing pipeline (async job model)

Processing is a background job, not a chain of blocking HTTP calls (a full episode takes far longer than any proxy/`fetch` timeout allows).

- **`POST /api/jobs`** — accepts JSON `{ url, refine, exportToCloud }` or multipart form-data with a `file`. Creates a job in `lib/jobStore.ts`, kicks off `lib/pipeline.ts:processJob` as a **fire-and-forget promise**, and returns `{ jobId }` immediately.
- **`GET /api/jobs/[id]`** — returns the job record; `app/page.tsx` polls this every 2s and mirrors it into `ProcessingState`.

`processJob` runs the stages in order, mutating the job record as it goes: `parsing` → `downloading` → `transcribing` → `refining` (optional) → `generating` → `completed`/`error`. It calls the `lib/*` functions directly (`parseSource`, `downloadAudio`, `transcribeAudio`, `refineTranscript`, `generateContent`/`generateSlides`/`generateMindmap`, `uploadToGoogleDrive`).

Key invariants:
- **The fire-and-forget promise only survives on a long-lived Node server** (`next dev` / `next start` / a container) — NOT on serverless functions, which freeze after the response.
- **`jobStore` is an in-memory `Map` stashed on `globalThis`** (survives dev hot-reload, single-process only — swap for Redis to scale horizontally).
- **Transcription is serialized** across jobs via a promise-chain lock in `pipeline.ts` (`transcribeLock`) — faster-whisper is CPU-bound, so concurrent jobs queue rather than thrash.
- Transcription progress is polled from the Python `/progress` endpoint on a 2s interval *inside* `processJob` and written to `job.progress`.

### AI transcript correction

`lib/transcriptRefiner.ts` runs an optional cleanup pass between transcribe and generate (the "AI Polish" toggle). It calls **Google Gemini** via its OpenAI-compatible chat API (`generativelanguage.googleapis.com/v1beta/openai`, key `GEMINI_API_KEY`, model `GEMINI_MODEL`). Segments are corrected in batches so per-segment timestamps survive; any failed/invalid batch (bad key, API error, count mismatch) **falls back to the original text** — refinement never breaks the pipeline.

### The fileId convention (important)

A `fileId` is the filename prefix used to thread state across routes. There is no database — routes locate files by `fs.readdirSync(uploadDir).find(f => f.startsWith(fileId))`.

- Download/parse fileIds end with the literal suffix `-錄音檔` (Chinese for "recording").
- `contentGenerator`, `slideGenerator`, and `mindmapGenerator` all derive the output folder and filenames by doing `fileId.replace("-錄音檔", ...)` — e.g. `-錄音檔` → `-文字檔` (text) / `-簡報` (slides) / `-心智圖` (mindmap). **Changing the suffix string in one generator breaks the others.** Upload fileIds do *not* have this suffix, so the `.replace` is a no-op for uploaded files.

### File serving

All generated and uploaded files live under `uploads/` (gitignored) and are served back through the catch-all route `app/api/files/[...path]/route.ts`. The first path segment routes the base dir: `audio/...` → `uploads/audio`, `rss/...` → `uploads/rss`, anything else → `uploads/output`. URLs returned by the generators (`/api/files/...`) point here.

### Python transcription service

`python-service/main.py` wraps `faster-whisper`. The model is loaded once at startup; size/device/compute are env-controlled (`WHISPER_MODEL_SIZE` default `small`, `WHISPER_DEVICE` default `cpu`, `WHISPER_COMPUTE_TYPE` default `int8`). Must run on **Python 3.13** — `ctranslate2` has no 3.14 wheels (use `python3.13 -m venv venv`). Transcriptions are cached as `<audio>.json` next to the audio file, tagged with a `_cache_sig` (file size + mtime) so a reused path with new content is re-transcribed instead of returning a stale transcript. Progress is held in an in-memory dict keyed by absolute file path.

### Optional integrations / graceful degradation

- **`contentGenerator.ts` produces template content** (summary, notes, NotebookLM sections are stubs) — the AI work happens in `transcriptRefiner.ts`, not here.
- **AI transcript correction** runs only if `GEMINI_API_KEY` is set and the "AI Polish" toggle is on; otherwise the raw transcript passes through untouched.
- **Google Drive export** uses OAuth (`lib/googleAuth.ts` + `lib/googleDrive.ts`): the user connects their own Drive via `/api/auth/google`, tokens are kept in the `p2n_gdrive` httpOnly cookie, and `POST /api/jobs` copies them into the job so the background pipeline can upload. Needs `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`; scope is `drive.file` and the folder is auto-created in the user's Drive. Disabled gracefully when unconfigured.
- **NotebookLM upload is manual** — there is no consumer API. The pipeline produces `notebooklm_source.md`; `OutputFilesCard.tsx` guides the user to download it and add it as a source in NotebookLM.

## Conventions

- TypeScript path alias `@/*` maps to repo root (e.g. `@/lib/jobStore`).
- API routes return `NextResponse.json({ error: message }, { status })` on failure; the client reads `errorData.error`.
- `lib/types.ts` (`PodcastMetadata`, `ProcessingState`, `ProcessingStatus`) is the shared contract between the page and the job records — keep it in sync when changing the `Job` shape in `jobStore.ts`.
- Calls to the Python service use `axios` (`lib/transcriber.ts`), never `fetch` — Node's built-in `fetch` (undici) aborts long requests at a fixed 5-minute `headersTimeout`, which a full transcription exceeds.
- `tsconfig.json` targets `es5`, so `for...of` over a `Map`/`Set` fails typecheck — use `.forEach`.
- Don't run `npm run build` while `npm run dev` is running; both write `.next/` and corrupt it. Stop dev first, or rely on `tsc --noEmit`.
