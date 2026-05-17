# Podcast2Notebook

Turn podcast episodes into searchable notes, NotebookLM sources, slides, and mind maps.

## Features
- **Fetch Audio**: Input an RSS feed, an episode URL, or a direct MP3/M4A link.
- **Transcribe locally**: Uses `faster-whisper` for fast, CPU-friendly speech-to-text.
- **Generate Content**: (Optional LLM) Creates structured notes, summaries, and notebook sources.
- **Create Slides & Mindmaps**: Automatically generates `.pptx` slides and an interactive mindmap HTML.
- **NotebookLM Integration**: Prepares a `notebooklm_source.md` ready to upload to NotebookLM as a source.

## Architecture
- **Frontend & Main Backend**: Next.js 14 (App Router) + React + Tailwind CSS
- **Transcription Service**: Python FastAPI microservice wrapping `faster-whisper`

## Installation

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Install Python service dependencies (Python 3.9+ recommended):
   ```bash
   cd python-service
   pip install -r requirements.txt
   ```

## Configuration

Copy `.env.example` to `.env` and fill in the optional values:
```bash
cp .env.example .env
```

## Running Locally

1. Start the Python Transcription Service:
   ```bash
   cd python-service
   python main.py
   ```
   (Runs on http://localhost:8000)

2. Start the Next.js App:
   ```bash
   npm run dev
   ```
   (Runs on http://localhost:3000)

## Uploading to NotebookLM

NotebookLM has no public consumer API (the only programmatic option is the
enterprise-only NotebookLM Enterprise API, which needs a Gemini Enterprise
licence and OAuth — not an API key). So upload is manual:

1. After processing, download the generated `notebooklm_source.md`.
2. Click **Open NotebookLM**, create or open a notebook, and add the file as a source.

## Future Roadmap
- Speaker diarization (distinguishing who is speaking)
- Batch import for multiple episodes
- Google Drive integration
- Cloud storage integration (S3 / GCS)
- SaaS Auth / Billing
