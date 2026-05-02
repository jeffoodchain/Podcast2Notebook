# Podcast2Notebook

Turn podcast episodes into searchable notes, NotebookLM sources, slides, and mind maps.

## Features
- **Fetch Audio**: Input an RSS feed, an episode URL, or a direct MP3/M4A link.
- **Transcribe locally**: Uses `faster-whisper` for fast, CPU-friendly speech-to-text.
- **Generate Content**: (Optional LLM) Creates structured notes, summaries, and notebook sources.
- **Create Slides & Mindmaps**: Automatically generates `.pptx` slides and an interactive mindmap HTML.
- **NotebookLM Integration**: Prepares a `notebooklm_source.md` and provides quick-links or API-based automatic import (when configured).

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

## NotebookLM Import Modes

1. **Manual Fallback (Default)**: The app generates a `notebooklm_source.md` and provides a button to open NotebookLM for manual upload.
2. **Automatic Import (Enterprise API)**: If you provide `NOTEBOOKLM_API_KEY` in your `.env`, it will automatically create a notebook and upload the source. (Currently an experimental placeholder until the API is widely available).

## Future Roadmap
- Speaker diarization (distinguishing who is speaking)
- Batch import for multiple episodes
- Google Drive integration
- Cloud storage integration (S3 / GCS)
- SaaS Auth / Billing
