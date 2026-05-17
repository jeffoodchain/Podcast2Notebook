import os
import json
import hashlib
import tempfile
from typing import Optional, List

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel
from faster_whisper import WhisperModel
import uvicorn

app = FastAPI(title="Podcast2Notebook Transcription Service")

# Progress keyed by the caller-supplied transcription_id. The audio file itself
# is uploaded over HTTP, so this service shares no filesystem with the web app
# and can run as a separate service / container / host.
transcription_progress = {}

MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

CACHE_DIR = os.getenv(
    "TRANSCRIPT_CACHE_DIR", os.path.join(tempfile.gettempdir(), "p2n-cache")
)
os.makedirs(CACHE_DIR, exist_ok=True)

print(f"Loading faster-whisper model '{MODEL_SIZE}' on {DEVICE}...")
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("Model loaded successfully.")


class Segment(BaseModel):
    start: float
    end: float
    text: str


class TranscribeResponse(BaseModel):
    text: str
    language: str
    segments: List[Segment]


def _run_transcription(audio_path: str, transcription_id: str, language: Optional[str]):
    """Blocking transcription — runs in a worker thread so the event loop (and
    the /progress endpoint) stays responsive."""
    segments_generator, info = model.transcribe(
        audio_path, beam_size=5, language=language
    )
    full_text = ""
    segments = []
    for segment in segments_generator:
        segments.append(
            {"start": segment.start, "end": segment.end, "text": segment.text}
        )
        full_text += segment.text + " "
        transcription_progress[transcription_id] = {
            "current_time": segment.end,
            "total_time": info.duration,
        }
        print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
    return {
        "text": full_text.strip(),
        "language": info.language,
        "segments": segments,
    }


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    transcription_id: str = Form(...),
    language: Optional[str] = Form(None),
):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Cache by content hash: the same audio always reuses its result, and a
    # different episode can never collide with it.
    digest = hashlib.sha256(contents).hexdigest()
    cache_path = os.path.join(CACHE_DIR, digest + ".json")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                print(f"Cache hit for {transcription_id} ({digest[:12]})")
                return json.load(f)
        except Exception as e:
            print(f"Cache read error: {e}")

    suffix = os.path.splitext(file.filename or "")[1] or ".mp3"
    tmp_path = os.path.join(tempfile.gettempdir(), f"p2n-{transcription_id}{suffix}")
    with open(tmp_path, "wb") as f:
        f.write(contents)

    try:
        print(f"Transcribing {transcription_id} ({len(contents)} bytes)...")
        result = await run_in_threadpool(
            _run_transcription, tmp_path, transcription_id, language
        )
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False)
        except Exception as e:
            print(f"Cache write error: {e}")
        return result
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        transcription_progress.pop(transcription_id, None)
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.get("/progress")
def get_progress(id: str):
    return transcription_progress.get(id) or {"status": "not_found"}


@app.get("/health")
def health_check():
    return {"status": "ok", "model": MODEL_SIZE, "device": DEVICE}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
